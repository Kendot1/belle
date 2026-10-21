import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import {
  BlockquoteBridge, BoldBridge, BulletListBridge, CoreBridge, EditorKeyboardAvoidingView, HardBreakBridge, HeadingBridge,
  HighlightBridge, HistoryBridge, ItalicBridge, ListItemBridge, OrderedListBridge, PlaceholderBridge,
  RichText, UnderlineBridge, useEditorBridge, useEditorContent,
} from '@10play/tentap-editor';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '../../core/components/ActionButton';
import { useNotesService } from '../../core/database/context';
import { createAnnotationAnchor, editorPositionToPlainTextOffset, plainTextOffsetToEditorPosition, resolveAnnotationAnchor, type AnnotationAnchor } from '../../features/annotations/anchor';
import { isAIInputWithinLimit, MAX_AI_INPUT_LENGTH, type AIAction, type AIAvailability } from '../../features/ai/provider';
import type { Annotation } from '../../features/notes/service';
import { COLLECTIONS, EMPTY_DOCUMENT, type EditorNode, type Note, type VersionedEditorDocument, plainTextFromDocument } from '../../features/notes/types';
import { useAIProvider } from '../../features/ai/context';
import { usePalette } from '../../core/theme';

type Sheet = 'comments' | 'comment' | 'collection' | 'ai' | null;
type Review = { action: AIAction; text: string; selection: { from: number; to: number } | null };
type SaveState = 'saved' | 'saving' | 'error';

function stableString(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableString).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableString(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function asDocument(value: unknown): VersionedEditorDocument | null {
  if (!value || typeof value !== 'object' || !('type' in value) || (value as { type?: unknown }).type !== 'doc') return null;
  return { version: 1, doc: value as EditorNode };
}

function generatedDocument(text: string): EditorNode {
  const paragraphs = text.trim().split(/\n+/).map((line) => line.trim()).filter(Boolean)
    .map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }));
  return { type: 'doc', content: paragraphs.length ? paragraphs : [{ type: 'paragraph' }] };
}

function anchorFor(annotation: Annotation): AnnotationAnchor {
  return { quote: annotation.quote, prefix: annotation.prefix, suffix: annotation.suffix, editorPosition: annotation.editorPosition };
}

function anchorLabel(status: 'attached' | 'ambiguous' | 'missing'): string {
  if (status === 'attached') return 'In text';
  if (status === 'ambiguous') return 'Needs review';
  return 'Quote no longer found';
}

export default function NoteEditorScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const service = useNotesService();
  const aiProvider = useAIProvider();
  const colors = usePalette();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [commentText, setCommentText] = useState('');
  const [pendingAnchor, setPendingAnchor] = useState<AnnotationAnchor | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ from: number; to: number } | null>(null);
  const pendingSourceSelection = useRef<{ from: number; to: number } | null>(null);
  const [aiAvailability, setAiAvailability] = useState<AIAvailability>({ available: false, status: 'checking', message: 'Checking whether on-device AI is ready…' });
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const cancelledRequests = useRef(new Set<string>());
  const pendingNavigationRef = useRef(false);

  const bridges = useMemo(() => [
    BoldBridge, ItalicBridge, UnderlineBridge, BlockquoteBridge, BulletListBridge, OrderedListBridge,
    HeadingBridge, HistoryBridge, HighlightBridge, CoreBridge, ListItemBridge, HardBreakBridge,
    PlaceholderBridge.configureExtension({ placeholder: 'Write what you want to remember…' }),
  ], []);
  const editor = useEditorBridge({ bridgeExtensions: bridges, autofocus: false, avoidIosKeyboard: true, initialContent: '<p></p>' });
  const content = useEditorContent(editor, { type: 'json', debounceInterval: 500 }) as EditorNode | undefined;
  const currentDocument = useMemo<VersionedEditorDocument | null>(() => {
    const document = asDocument(content);
    return document ? { version: 1, doc: document.doc } : null;
  }, [content]);
  const currentText = currentDocument ? plainTextFromDocument(currentDocument) : note?.plainText ?? '';
  const editorReady = Boolean(hydrated && note && currentDocument && stableString(currentDocument.doc) === stableString(note.document.doc));

  const loadNote = useCallback(async () => {
    setLoading(true); setLoadError(false); setHydrated(false);
    try {
      const [loaded, loadedAnnotations] = await Promise.all([service.get(id), service.listAnnotations(id)]);
      if (!loaded) { setNote(null); setLoadError(true); return; }
      const document = loaded.document?.version === 1 ? loaded.document : EMPTY_DOCUMENT;
      setNote({ ...loaded, document });
      setTitle(loaded.title);
      setAnnotations(loadedAnnotations);
      // Emit a content update so useEditorContent can read the hydrated document;
      // autosave remains gated until both this read and note hydration complete.
      editor.setContent(document.doc);
      setHydrated(true);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [editor, id, service]);

  const refreshAIAvailability = useCallback(async () => {
    setAiAvailability(await aiProvider.availability());
  }, [aiProvider]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return loadNote(); });
    return () => { cancelled = true; };
  }, [loadNote]);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return refreshAIAvailability(); });
    return () => { cancelled = true; };
  }, [refreshAIAvailability]);

  const saveNow = useCallback(async () => {
    if (!id || !hydrated || !editorReady) return false;
    setSaveState('saving');
    try {
      const latest = asDocument(await editor.getJSON()) ?? currentDocument;
      if (!latest) throw new Error('Editor content is not ready');
      const text = plainTextFromDocument(latest);
      await service.saveContent(id, title, latest, text);
      setNote((value) => value ? { ...value, title, document: latest, plainText: text, updatedAt: Date.now() } : value);
      setSaveState('saved');
      return true;
    } catch { setSaveState('error'); return false; }
  }, [currentDocument, editor, editorReady, hydrated, id, service, title]);

  useEffect(() => {
    if (!hydrated || !editorReady || !currentDocument) return;
    const timer = setTimeout(() => { void saveNow(); }, 650);
    return () => clearTimeout(timer);
  }, [currentDocument, editorReady, hydrated, saveNow, title]);

  useEffect(() => {
    if (!editorReady) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void saveNow();
      if (state === 'active') void refreshAIAvailability();
    });
    return () => subscription.remove();
  }, [editorReady, refreshAIAvailability, saveNow]);

  useEffect(() => () => {
    if (activeRequest) void aiProvider.cancel(activeRequest).catch(() => {});
  }, [activeRequest, aiProvider]);

  useEffect(() => {
    const selection = pendingSourceSelection.current;
    if (!selection || sheet === 'comments') return;
    editor.setSelection(selection.from, selection.to);
    editor.focus();
    pendingSourceSelection.current = null;
  }, [editor, sheet]);

  const disableRemovalPrevention = usePreventRemove(editorReady, ({ repeat }) => {
    if (pendingNavigationRef.current) return;
    pendingNavigationRef.current = true;
    void saveNow().then((saved) => {
      if (!saved) {
        Alert.alert('Note not saved yet', 'Keep this screen open and retry saving before you leave.', [{ text: 'OK' }]);
        return;
      }
      repeat();
    }).finally(() => { pendingNavigationRef.current = false; });
  });

  useEffect(() => {
    const scheme = colors.background === '#111915' ? 'dark' : 'light';
    editor.injectCSS(`
      html, body { background: ${colors.background} !important; color: ${colors.text} !important; }
      .tiptap { color: ${colors.text} !important; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 18px; line-height: 1.65; min-height: 100%; padding: 14px 18px 36px; caret-color: ${colors.action}; }
      .tiptap p { margin: 0 0 14px; }
      .tiptap h1, .tiptap h2, .tiptap h3 { color: ${colors.text}; line-height: 1.25; margin: 22px 0 12px; }
      .tiptap blockquote { border-left: 3px solid ${colors.action}; color: ${colors.secondary}; padding-left: 14px; }
      .tiptap mark { background: ${colors.highlight}; border-radius: 3px; color: ${colors.text}; }
      .tiptap ul, .tiptap ol { padding-left: 24px; }
      .tiptap p.is-editor-empty:first-child::before { color: ${colors.secondary}; }
    `, `quiet-notes-${scheme}`);
  }, [colors.action, colors.background, colors.highlight, colors.secondary, colors.text, editor]);

  const handleBack = useCallback(async () => {
    if (editorReady && !(await saveNow())) {
      Alert.alert('Note not saved yet', 'Keep this screen open and retry saving before you leave.', [{ text: 'OK' }]);
      return;
    }
    disableRemovalPrevention();
    router.back();
  }, [disableRemovalPrevention, editorReady, saveNow]);

  const openCommentSheet = useCallback(async () => {
    try {
      const selection = editor.getEditorState().selection;
      if (selection.from === selection.to) {
        Alert.alert('Select some text first', 'Touch and hold a phrase in your note, then choose Comment.', [{ text: 'OK' }]);
        return;
      }
      const quote = (await editor.getSelectedText()).trim();
      if (!quote) { Alert.alert('Select some text first', 'Choose a few words to attach this comment to.', [{ text: 'OK' }]); return; }
      const document = asDocument(await editor.getJSON());
      const plainTextPosition = document ? editorPositionToPlainTextOffset(document, selection.from) : null;
      if (!document || plainTextPosition === null) {
        Alert.alert('Selection unavailable', 'The selected text position could not be matched to the note. Try selecting it again.', [{ text: 'OK' }]);
        return;
      }
      const anchor = createAnnotationAnchor(plainTextFromDocument(document), quote, plainTextPosition);
      setPendingAnchor({ ...anchor, editorPosition: selection.from });
      setPendingSelection({ from: selection.from, to: selection.to });
      setCommentText('');
      setSheet('comment');
    } catch { Alert.alert('Selection unavailable', 'The selected text could not be read. Try selecting it again.', [{ text: 'OK' }]); }
  }, [editor]);

  const saveComment = useCallback(async () => {
    if (!id || !pendingAnchor || !pendingSelection || !commentText.trim()) return;
    try {
      editor.setSelection(pendingSelection.from, pendingSelection.to);
      editor.setHighlight(colors.highlight);
      const latest = asDocument(await editor.getJSON());
      if (!latest) throw new Error('Editor content is not ready');
      const text = plainTextFromDocument(latest);
      const annotation = {
        quote: pendingAnchor.quote, prefix: pendingAnchor.prefix, suffix: pendingAnchor.suffix,
        editorPosition: pendingAnchor.editorPosition, comment: commentText.trim(),
      };
      setSaveState('saving');
      const savedAnnotation = await service.saveContentWithAnnotation(id, title, latest, text, annotation);
      setNote((value) => value ? { ...value, title, document: latest, plainText: text, updatedAt: Date.now() } : value);
      setAnnotations((value) => [savedAnnotation, ...value]);
      setSaveState('saved');
      setSheet(null);
    } catch {
      setSaveState('error');
      Alert.alert('Comment could not be saved', 'Your note is still open. Try again; the selected text has not been removed.', [{ text: 'OK' }]);
    }
  }, [colors.highlight, commentText, editor, id, pendingAnchor, pendingSelection, service, title]);

  const runAI = useCallback(async (action: AIAction) => {
    if (!aiAvailability.available) return;
    let requestID: string | null = null;
    try {
      let selection: { from: number; to: number } | null = null;
      let input: string;
      if (action === 'rewrite') {
        const selected = editor.getEditorState().selection;
        if (selected.from === selected.to) {
          Alert.alert('Select a passage first', 'Touch and hold the text you want rewritten, then open AI again.', [{ text: 'OK' }]);
          return;
        }
        input = (await editor.getSelectedText()).trim();
        selection = { from: selected.from, to: selected.to };
      } else input = (await editor.getText()).trim();
      if (!input) { Alert.alert('Add some text first', 'Write a few lines before asking for a summary or key points.', [{ text: 'OK' }]); return; }
      if (!isAIInputWithinLimit(input)) {
        Alert.alert('Choose a shorter passage', `On-device AI can use up to ${MAX_AI_INPUT_LENGTH.toLocaleString()} characters at a time. Select a shorter passage and try again.`, [{ text: 'OK' }]);
        return;
      }

      const nextRequestID = aiProvider.createRequestID();
      requestID = nextRequestID;
      setActiveRequest(nextRequestID);
      editor.setEditable(false);
      const output = (await aiProvider.generate(nextRequestID, action, input)).trim();
      if (cancelledRequests.current.has(nextRequestID)) return;
      if (!output) throw new Error('The on-device model returned an empty result.');
      setReview({ action, text: output.slice(0, 12_000), selection });
      setSheet(null);
    } catch (error) {
      if (requestID && cancelledRequests.current.has(requestID)) return;
      if (error instanceof Error && /cancel/i.test(error.message)) {
        editor.setEditable(true);
        return;
      }
      Alert.alert('AI could not finish', 'The on-device model did not complete this action. Your note has not changed.', [{ text: 'OK' }]);
      editor.setEditable(true);
    } finally {
      if (requestID) {
        cancelledRequests.current.delete(requestID);
        setActiveRequest((current) => current === requestID ? null : current);
      }
    }
  }, [aiAvailability.available, aiProvider, editor]);

  const cancelAI = useCallback(async () => {
    if (!activeRequest) return;
    cancelledRequests.current.add(activeRequest);
    try { await aiProvider.cancel(activeRequest); } catch { /* The note is unchanged if cancellation arrives late. */ }
    editor.setEditable(true);
    setActiveRequest((current) => current === activeRequest ? null : current);
    setSheet(null);
  }, [activeRequest, aiProvider, editor]);

  const applyAIResult = useCallback(async () => {
    if (!review) return;
    editor.setEditable(true);
    if (review.action === 'rewrite' && review.selection) {
      editor.setSelection(review.selection.from, review.selection.to);
      editor.insertContent({ type: 'text', text: review.text });
    } else {
      editor.focus('end');
      editor.insertContent(generatedDocument(review.text));
    }
    setReview(null);
    if (!(await saveNow())) setSaveState('error');
  }, [editor, review, saveNow]);

  const chooseCollection = useCallback(async (collection: string) => {
    if (!id) return;
    try {
      await service.move(id, collection);
      setNote((value) => value ? { ...value, collection, updatedAt: Date.now() } : value);
      setSheet(null);
    } catch { Alert.alert('Could not move this note', 'Your note has not been moved. Try again.', [{ text: 'OK' }]); }
  }, [id, service]);

  const deleteAnnotation = useCallback((annotation: Annotation) => {
    Alert.alert('Remove this comment?', 'The highlight formatting will stay in your note.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove comment', style: 'destructive', onPress: () => {
        void service.removeAnnotation(annotation.id)
          .then(() => setAnnotations((items) => items.filter((item) => item.id !== annotation.id)))
          .catch(() => Alert.alert('Could not remove comment', 'Try again in a moment.', [{ text: 'OK' }]));
      } },
    ]);
  }, [service]);

  const showAnnotationSource = useCallback((resolution: ReturnType<typeof resolveAnnotationAnchor>) => {
    if (resolution.status !== 'attached') {
      Alert.alert('Source needs review', 'This comment no longer points to one unique passage. Review the quote before returning to it.', [{ text: 'OK' }]);
      return;
    }
    if (!note) return;
    const document = currentDocument ?? note.document;
    const from = plainTextOffsetToEditorPosition(document, resolution.start);
    const lastCharacter = plainTextOffsetToEditorPosition(document, resolution.end - 1);
    if (from === null || lastCharacter === null) {
      Alert.alert('Source text unavailable', 'The comment is saved, but its source position could not be mapped in the editor.', [{ text: 'OK' }]);
      return;
    }
    pendingSourceSelection.current = { from, to: lastCharacter + 1 };
    setSheet(null);
  }, [currentDocument, note]);

  const statusLabel = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Couldn’t save' : 'Saved';

  if (loading) return (
    <SafeAreaView style={[styles.page, styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.action} size="large" accessibilityLabel="Loading note" />
      <Text style={[styles.centerText, { color: colors.secondary }]}>Opening note on this device…</Text>
      <ActionButton label="Back to notes" onPress={() => router.back()} compact />
    </SafeAreaView>
  );

  if (loadError || !note) return (
    <SafeAreaView style={[styles.page, styles.center, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[styles.centerTitle, { color: colors.text }]}>This note isn’t available</Text>
      <Text style={[styles.centerText, { color: colors.secondary }]}>It may have been deleted or the local database may be unavailable.</Text>
      <ActionButton label="Try again" onPress={() => { void loadNote(); }} compact />
      <ActionButton label="Back to notes" onPress={() => router.back()} compact variant="quiet" />
    </SafeAreaView>
  );

  const currentNote = note;

  const allAnnotations = annotations.map((annotation) => ({ ...annotation, resolution: resolveAnnotationAnchor(currentText, anchorFor(annotation)) }));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.page, { backgroundColor: colors.background }]}>
      <EditorKeyboardAvoidingView style={styles.keyboardFrame}>
        <View style={styles.header}>
          <ActionButton label="Back" onPress={() => { void handleBack(); }} compact variant="quiet" accessibilityLabel="Save and return to notes" testID="back-to-notes" />
          <View style={styles.statusWrap}>
            <View style={[styles.statusDot, { backgroundColor: saveState === 'error' ? colors.danger : saveState === 'saving' ? colors.highlight : colors.action }]} />
            <Text accessibilityLabel={`Save status: ${statusLabel}`} style={[styles.statusText, { color: saveState === 'error' ? colors.danger : colors.secondary }]}>{statusLabel}</Text>
          </View>
          <ActionButton label={currentNote.pinned ? 'Pinned' : 'Pin'} onPress={() => {
            void service.setPinned(id, !currentNote.pinned)
              .then(() => setNote((value) => value ? { ...value, pinned: !currentNote.pinned } : value))
              .catch(() => Alert.alert('Could not update pin', 'Try again.', [{ text: 'OK' }]));
          }} compact variant="quiet" accessibilityLabel={currentNote.pinned ? 'Unpin note' : 'Pin note'} accessibilityState={{ selected: currentNote.pinned }} testID="toggle-pin" />
        </View>

        {saveState === 'error' ? (
          <View style={[styles.saveError, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text accessibilityRole="alert" style={[styles.saveErrorText, { color: colors.danger }]}>Your latest changes are still here, but they have not been saved.</Text>
            <ActionButton label="Retry save" compact onPress={() => { void saveNow(); }} testID="retry-save" />
          </View>
        ) : null}

        <TextInput value={title} onChangeText={setTitle} placeholder="Untitled note" placeholderTextColor={colors.secondary}
          returnKeyType="next" blurOnSubmit accessibilityLabel="Note title" testID="note-title"
          style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.border }]} />
        <View style={styles.metaRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Move to collection. Current collection: ${currentNote.collection}`}
            testID="choose-collection" onPress={() => setSheet('collection')}
            style={({ pressed }) => [styles.collectionChip, { backgroundColor: colors.subtle, opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[styles.collectionChipText, { color: colors.action }]}>{currentNote.collection}</Text>
            <Text style={[styles.chevron, { color: colors.secondary }]} accessible={false}>⌄</Text>
          </Pressable>
          <Text style={[styles.localOnly, { color: colors.secondary }]}>Private · On device</Text>
        </View>

        <View accessibilityLabel="Rich text note editor" style={[styles.editorFrame, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {hydrated ? <RichText editor={editor} /> : <ActivityIndicator color={colors.action} accessibilityLabel="Loading editor" />}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.toolbar}>
          <ActionButton label="B" compact onPress={() => editor.toggleBold()} accessibilityLabel="Bold selected text" testID="format-bold" />
          <ActionButton label="I" compact onPress={() => editor.toggleItalic()} accessibilityLabel="Italic selected text" testID="format-italic" />
          <ActionButton label="H" compact onPress={() => editor.toggleHeading(2)} accessibilityLabel="Toggle heading" testID="format-heading" />
          <ActionButton label="• List" compact onPress={() => editor.toggleBulletList()} accessibilityLabel="Toggle bulleted list" testID="format-list" />
          <ActionButton label="Highlight" compact onPress={() => editor.toggleHighlight(colors.highlight)} accessibilityLabel="Highlight selected text" testID="format-highlight" />
          <ActionButton label="Undo" compact onPress={() => editor.undo()} accessibilityLabel="Undo last edit" testID="editor-undo" />
          <ActionButton label="Redo" compact onPress={() => editor.redo()} accessibilityLabel="Redo last edit" testID="editor-redo" />
          <ActionButton label={`Comments ${annotations.length || ''}`} compact onPress={() => setSheet('comments')} accessibilityLabel={`Open ${annotations.length} comments`} testID="open-comments" />
          <ActionButton label="Comment" compact onPress={() => { void openCommentSheet(); }} accessibilityLabel="Comment on selected text" testID="add-comment" />
          <ActionButton label="AI" compact onPress={() => setSheet('ai')} accessibilityLabel="Open on-device AI actions" testID="open-ai" />
        </ScrollView>
      </EditorKeyboardAvoidingView>

      <Modal visible={sheet === 'comment'} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={() => setSheet(null)}>
        <View style={styles.commentOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel adding a comment"
            accessibilityHint="Close the dialog and discard this unsaved comment."
            testID="comment-backdrop-dismiss"
            onPress={() => setSheet(null)}
            style={styles.commentBackdrop}
          />
          <KeyboardAvoidingView pointerEvents="box-none" style={styles.commentKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <SafeAreaView edges={['bottom']} style={[styles.commentDialog, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.commentSheetHeader}>
              <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>Add a comment</Text>
              <ActionButton label="Cancel" compact variant="quiet" onPress={() => setSheet(null)} />
            </View>
            <ScrollView
              style={styles.commentFormScroll}
              contentContainerStyle={styles.commentFormContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.sheetHint, { color: colors.secondary }]}>This comment will stay attached to the selected words.</Text>
              <View style={styles.quoteSection}>
                <Text style={[styles.commentSectionLabel, { color: colors.secondary }]}>Selected passage</Text>
                <View style={[styles.quoteBox, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.highlight }]}>
                  <ScrollView nestedScrollEnabled style={styles.quoteScroll} contentContainerStyle={styles.quoteContent} showsVerticalScrollIndicator>
                    <Text style={[styles.quoteText, { color: colors.text }]}>“{pendingAnchor?.quote}”</Text>
                  </ScrollView>
                </View>
              </View>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a thought or reminder…"
                placeholderTextColor={colors.secondary}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Comment text for selected passage"
                testID="comment-input"
                style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
            </ScrollView>
            <View style={[styles.commentFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
              <ActionButton label="Save comment" onPress={() => { void saveComment(); }} variant="primary" disabled={!commentText.trim()} testID="save-comment" />
            </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={sheet === 'comments'} animationType="none" presentationStyle="pageSheet" onRequestClose={() => setSheet(null)}>
        <SafeAreaView style={[styles.sheetPage, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>Comments</Text><ActionButton label="Done" compact variant="quiet" onPress={() => setSheet(null)} /></View>
          {!allAnnotations.length ? (
            <View style={styles.sheetEmpty}><Text style={[styles.sheetEmptyTitle, { color: colors.text }]}>No comments yet</Text><Text style={[styles.sheetHint, { color: colors.secondary }]}>Select text in your note and choose Comment to leave yourself a reminder.</Text></View>
          ) : (
            <ScrollView contentContainerStyle={styles.annotationList}>
              {allAnnotations.map((annotation) => (
                <View key={annotation.id} style={[styles.annotationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.annotationHeader}>
                    <Text style={[styles.annotationStatus, { color: annotation.resolution.status === 'attached' ? colors.action : colors.danger }]}>{anchorLabel(annotation.resolution.status)}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove comment on ${annotation.quote}`} testID={`delete-annotation-${annotation.id}`} hitSlop={8} onPress={() => deleteAnnotation(annotation)} style={styles.removeAnnotation}>
                      <Text style={[styles.removeAnnotationText, { color: colors.danger }]}>Remove</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.annotationQuote, { color: colors.text }]}>“{annotation.quote}”</Text>
                  <Text style={[styles.annotationComment, { color: colors.secondary }]}>{annotation.comment}</Text>
                  {annotation.resolution.status === 'attached' ? (
                    <ActionButton label="Show in note" compact variant="quiet" accessibilityLabel={`Show source text for comment on ${annotation.quote}`}
                      testID={`show-annotation-source-${annotation.id}`} onPress={() => showAnnotationSource(annotation.resolution)} />
                  ) : null}
                  {annotation.resolution.status !== 'attached' ? <Text style={[styles.anchorHelp, { color: colors.secondary }]}>Your comment is saved. Review the surrounding note text to decide where it belongs.</Text> : null}
                </View>
              ))}
            </ScrollView>
          )}
          <ActionButton label="Done" variant="primary" onPress={() => setSheet(null)} />
        </SafeAreaView>
      </Modal>

      <Modal visible={sheet === 'collection'} animationType="none" presentationStyle="pageSheet" onRequestClose={() => setSheet(null)}>
        <SafeAreaView style={[styles.sheetPage, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>Move note</Text><ActionButton label="Cancel" compact variant="quiet" onPress={() => setSheet(null)} /></View>
          <Text style={[styles.sheetHint, { color: colors.secondary }]}>Choose where this note belongs.</Text>
          {COLLECTIONS.map((collection) => (
            <Pressable key={collection} accessibilityRole="radio" accessibilityLabel={collection} accessibilityState={{ selected: currentNote.collection === collection }}
              testID={`move-${collection.toLowerCase()}`} onPress={() => { void chooseCollection(collection); }}
              style={[styles.collectionOption, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.collectionOptionText, { color: colors.text }]}>{collection}</Text>
              <Text style={[styles.collectionOptionCheck, { color: colors.action }]}>{currentNote.collection === collection ? 'Selected' : 'Choose'}</Text>
            </Pressable>
          ))}
        </SafeAreaView>
      </Modal>

      <Modal visible={sheet === 'ai' || activeRequest !== null} animationType="none" presentationStyle="pageSheet" onRequestClose={() => { void cancelAI(); }}>
        <SafeAreaView style={[styles.sheetPage, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>On-device AI</Text>{!activeRequest ? <ActionButton label="Close" compact variant="quiet" onPress={() => setSheet(null)} /> : null}</View>
          <Text style={[styles.sheetHint, { color: colors.secondary }]}>{aiAvailability.message}</Text>
          <Text style={[styles.aiPrivacy, { color: colors.secondary }]}>Only chosen text is supplied. Nothing is sent to a remote model. You review any result before it changes your note.</Text>
          {activeRequest ? (
            <View style={[styles.aiProgress, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.action} size="large" accessibilityLabel="Generating on this device" />
              <Text accessibilityRole="text" style={[styles.aiProgressText, { color: colors.text }]}>Working on this device…</Text>
              <Text style={[styles.sheetHint, { color: colors.secondary }]}>Your note is unchanged while the model works.</Text>
              <ActionButton label="Cancel" onPress={() => { void cancelAI(); }} variant="secondary" testID="cancel-ai" />
            </View>
          ) : (
            <View style={styles.aiActions}>
              <ActionButton label="Summarize this note" variant="primary" disabled={!aiAvailability.available} onPress={() => { void runAI('summary'); }} testID="ai-summary" />
              <ActionButton label="Extract key points" disabled={!aiAvailability.available} onPress={() => { void runAI('key-points'); }} testID="ai-key-points" />
              <ActionButton label="Rewrite selected text" disabled={!aiAvailability.available} onPress={() => { void runAI('rewrite'); }} testID="ai-rewrite" />
              {aiAvailability.status === 'checking' ? <ActivityIndicator color={colors.action} accessibilityLabel="Checking AI availability" /> : null}
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh on-device AI availability" onPress={() => { void refreshAIAvailability(); }} style={styles.refreshAvailability}>
            <Text style={[styles.refreshAvailabilityText, { color: colors.action }]}>Check availability again</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>

      <Modal visible={review !== null} animationType="none" presentationStyle="pageSheet" onRequestClose={() => { setReview(null); editor.setEditable(true); }}>
        <SafeAreaView style={[styles.sheetPage, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>Review AI result</Text>
            <ActionButton label="Discard" compact variant="quiet" onPress={() => { setReview(null); editor.setEditable(true); }} accessibilityLabel="Discard AI result" testID="discard-ai-result" />
          </View>
          <Text style={[styles.sheetHint, { color: colors.secondary }]}>Read this suggestion before using it. Your saved note has not changed.</Text>
          <ScrollView style={[styles.resultBox, { backgroundColor: colors.surface, borderColor: colors.border }]} contentContainerStyle={styles.resultContent}>
            <Text selectable style={[styles.resultText, { color: colors.text }]}>{review?.text}</Text>
          </ScrollView>
          <ActionButton label={review?.action === 'rewrite' ? 'Replace selected text' : 'Insert into note'} variant="primary" onPress={() => { void applyAIResult(); }} testID="apply-ai-result" />
          <ActionButton label="Discard suggestion" compact variant="quiet" onPress={() => { setReview(null); editor.setEditable(true); }} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 }, keyboardFrame: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  centerTitle: { fontSize: 23, fontWeight: '700', textAlign: 'center' }, centerText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  header: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 }, statusDot: { width: 7, height: 7, borderRadius: 5 }, statusText: { fontSize: 12, fontWeight: '500' },
  saveError: { marginHorizontal: 18, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, saveErrorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  titleInput: { marginHorizontal: 20, marginTop: 7, paddingBottom: 10, borderBottomWidth: 1, fontFamily: 'Georgia', fontSize: 30, lineHeight: 39, minHeight: 52 },
  metaRow: { minHeight: 47, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collectionChip: { minHeight: 44, paddingHorizontal: 11, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 7 }, collectionChipText: { fontSize: 13, fontWeight: '600' }, chevron: { fontSize: 17, marginTop: -4 }, localOnly: { fontSize: 12 },
  editorFrame: { flex: 1, minHeight: 160, marginHorizontal: 12, marginTop: 3, borderWidth: 1, borderRadius: 17, overflow: 'hidden', justifyContent: 'center' },
  toolbar: { minHeight: 60, alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  sheetPage: { flex: 1, padding: 22, gap: 16 }, sheetHeader: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, sheetTitle: { flex: 1, fontFamily: 'Georgia', fontSize: 27, lineHeight: 34 }, sheetHint: { fontSize: 15, lineHeight: 22 },
  commentOverlay: { flex: 1 }, commentBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28, 37, 31, 0.46)' },
  commentKeyboard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  commentDialog: { width: '100%', maxWidth: 560, height: '86%', maxHeight: 680, borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  commentSheetHeader: { minHeight: 58, paddingHorizontal: 22, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  commentFormScroll: { flex: 1 }, commentFormContent: { gap: 16, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 },
  quoteSection: { gap: 8 }, commentSectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  quoteBox: { maxHeight: 156, borderLeftWidth: 4, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }, quoteScroll: { maxHeight: 152 }, quoteContent: { padding: 14 }, quoteText: { fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
  commentInput: { minHeight: 132, maxHeight: 220, borderWidth: 1, borderRadius: 15, padding: 14, fontSize: 16, lineHeight: 23 },
  commentFooter: { paddingHorizontal: 22, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  sheetEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 20 }, sheetEmptyTitle: { fontSize: 19, fontWeight: '600' },
  annotationList: { gap: 12, paddingBottom: 14 }, annotationCard: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 9 }, annotationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  annotationStatus: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }, removeAnnotation: { minHeight: 44, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center' }, removeAnnotationText: { fontSize: 13, fontWeight: '600' }, annotationQuote: { fontSize: 16, lineHeight: 23, fontWeight: '600' }, annotationComment: { fontSize: 15, lineHeight: 22 }, anchorHelp: { fontSize: 13, lineHeight: 19 },
  collectionOption: { minHeight: 56, borderWidth: 1, borderRadius: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, collectionOptionText: { fontSize: 16, fontWeight: '600' }, collectionOptionCheck: { fontSize: 13, fontWeight: '600' },
  aiPrivacy: { fontSize: 13, lineHeight: 20 }, aiActions: { gap: 10 }, aiProgress: { minHeight: 250, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 13 }, aiProgressText: { fontSize: 18, fontWeight: '600' },
  refreshAvailability: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' }, refreshAvailabilityText: { fontSize: 14, fontWeight: '600' },
  resultBox: { flex: 1, borderWidth: 1, borderRadius: 17, maxHeight: 500 }, resultContent: { padding: 17 }, resultText: { fontSize: 16, lineHeight: 24 },
});
