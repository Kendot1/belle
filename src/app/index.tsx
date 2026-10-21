import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '../core/components/ActionButton';
import { useNotesService } from '../core/database/context';
import { COLLECTIONS, makePreview, type Note } from '../features/notes/types';
import { usePalette } from '../core/theme';

type Filter = 'All' | 'Pinned' | (typeof COLLECTIONS)[number];

function updatedLabel(timestamp: number): string {
  const now = new Date();
  const changed = new Date(timestamp);
  if (changed.toDateString() === now.toDateString()) return `Today, ${changed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return changed.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotesHomeScreen() {
  const service = useNotesService();
  const colors = usePalette();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCommittedSearch(search.trim()), 180);
    return () => clearTimeout(timer);
  }, [search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await service.list({
        query: committedSearch,
        collection: COLLECTIONS.includes(filter as (typeof COLLECTIONS)[number]) ? filter : null,
        pinnedOnly: filter === 'Pinned',
      });
      setNotes(result);
    } catch {
      setError('Your notes could not be loaded. They are still stored on this device.');
    } finally { setLoading(false); }
  }, [committedSearch, filter, service]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const createNote = useCallback(async () => {
    try {
      const collection = COLLECTIONS.includes(filter as (typeof COLLECTIONS)[number]) ? filter : 'Personal';
      const note = await service.create(collection);
      router.push({ pathname: '/note/[id]', params: { id: note.id } });
    } catch { setError('A new note could not be created. Check device storage and try again.'); }
  }, [filter, service]);

  const openNoteActions = useCallback((note: Note) => {
    Alert.alert(note.title.trim() || 'Untitled note', 'Choose an action for this note.', [
      {
        text: note.pinned ? 'Unpin note' : 'Pin note',
        onPress: () => { void service.setPinned(note.id, !note.pinned).then(refresh).catch(() => setError('The note could not be updated.')); },
      },
      {
        text: 'Move to collection',
        onPress: () => Alert.alert('Move note', 'Choose a collection.', [
          ...COLLECTIONS.map((collection) => ({
            text: collection,
            onPress: () => { void service.move(note.id, collection).then(refresh).catch(() => setError('The note could not be moved.')); },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]),
      },
      {
        text: 'Delete note', style: 'destructive',
        onPress: () => Alert.alert('Delete this note?', 'This also removes its comments. This action cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { void service.remove(note.id).then(refresh).catch(() => setError('The note could not be deleted.')); } },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [refresh, service]);

  const filters = useMemo<Filter[]>(() => ['All', ...COLLECTIONS, 'Pinned'], []);
  const emptyTitle = committedSearch ? 'No matching notes' : filter === 'Pinned' ? 'Nothing pinned yet' : 'A little space for a first thought';
  const emptyMessage = committedSearch
    ? 'Try a different word or search by title and note text.'
    : filter === 'Pinned'
      ? 'Pin a note from its actions and it will be easy to find here.'
      : 'Capture a thought, a list, or anything you want to keep close.';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.secondary }]}>A QUIET PLACE TO THINK</Text>
            <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>Notes</Text>
          </View>
          <ActionButton label="Privacy" compact variant="quiet" onPress={() => setPrivacyOpen(true)} accessibilityLabel="Privacy and on-device AI information" testID="privacy-info" />
        </View>
        <View style={[styles.localBadge, { backgroundColor: colors.subtle }]}>
          <View style={[styles.localDot, { backgroundColor: colors.action }]} />
          <Text style={[styles.localLabel, { color: colors.secondary }]}>On this device · works offline</Text>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.searchGlyph, { color: colors.secondary }]} accessible={false}>⌕</Text>
          <TextInput
            value={search} onChangeText={setSearch} placeholder="Search your notes" placeholderTextColor={colors.secondary}
            returnKeyType="search" clearButtonMode="while-editing"
            accessibilityLabel="Search notes by title or content" accessibilityHint="Search stays on this device"
            testID="notes-search" style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((item) => {
            const selected = filter === item;
            return (
              <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${item} notes`} accessibilityState={{ selected }}
                testID={`filter-${item.toLowerCase()}`} onPress={() => setFilter(item)}
                style={({ pressed }) => [styles.filterChip, { backgroundColor: selected ? colors.action : colors.surface, borderColor: selected ? colors.action : colors.border, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[styles.filterText, { color: selected ? colors.actionText : colors.secondary }]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your notebook</Text>
          <Text style={[styles.count, { color: colors.secondary }]}>{notes.length ? `${notes.length}` : ''}</Text>
        </View>

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            <ActionButton label="Retry" onPress={() => { void refresh(); }} compact />
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.action} /><Text style={[styles.loadingText, { color: colors.secondary }]}>Opening notes on this device…</Text></View>
        ) : notes.length ? (
          <View style={styles.noteList}>
            {notes.map((note) => (
              <Pressable key={note.id} accessibilityRole="button"
                accessibilityLabel={`${note.title.trim() || 'Untitled note'}, ${note.collection}${note.pinned ? ', pinned' : ''}, updated ${updatedLabel(note.updatedAt)}${note.plainText ? `, ${makePreview(note.plainText, 100)}` : ''}`}
                accessibilityHint="Opens this note" testID={`note-card-${note.id}`}
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
                style={({ pressed }) => [styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}>
                <View style={styles.noteCardTop}>
                  <View style={styles.noteMetadata}>
                    <Text style={[styles.collectionLabel, { color: colors.action }]}>{note.collection.toUpperCase()}</Text>
                    <Text style={[styles.dotSeparator, { color: colors.secondary }]}>·</Text>
                    <Text style={[styles.dateLabel, { color: colors.secondary }]}>{updatedLabel(note.updatedAt)}</Text>
                    {note.pinned ? <Text style={[styles.pinnedLabel, { color: colors.secondary }]}>Pinned</Text> : null}
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${note.title.trim() || 'Untitled note'}`}
                    accessibilityHint="Pin, move, or delete this note" testID={`note-actions-${note.id}`} hitSlop={8}
                    onPress={(event) => { event.stopPropagation(); openNoteActions(note); }} style={styles.moreButton}>
                    <Text style={[styles.moreGlyph, { color: colors.secondary }]}>•••</Text>
                  </Pressable>
                </View>
                <Text numberOfLines={1} style={[styles.noteTitle, { color: colors.text }]}>{note.title.trim() || 'Untitled note'}</Text>
                <Text numberOfLines={2} style={[styles.notePreview, { color: colors.secondary }]}>{makePreview(note.plainText) || 'A blank page, ready when you are.'}</Text>
              </Pressable>
            ))}
          </View>
        ) : !error ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyMark, { backgroundColor: colors.highlight }]}><Text style={[styles.emptyMarkText, { color: colors.text }]} accessible={false}>✳</Text></View>
            <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
            <Text style={[styles.emptyMessage, { color: colors.secondary }]}>{emptyMessage}</Text>
            {!committedSearch && filter !== 'Pinned' ? <ActionButton label="Write a note" onPress={() => { void createNote(); }} variant="primary" testID="empty-create-note" /> : null}
          </View>
        ) : null}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.secondary }]}>Private by default</Text>
          <Text style={[styles.footerText, { color: colors.secondary }]}>No account · No sync</Text>
        </View>
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Create a new note" accessibilityHint="Creates a private note stored on this device"
        testID="create-note" onPress={() => { void createNote(); }}
        style={({ pressed }) => [styles.floatingButton, { backgroundColor: colors.action, opacity: pressed ? 0.82 : 1 }]}>
        <Text style={[styles.floatingGlyph, { color: colors.actionText }]} accessible={false}>＋</Text>
        <Text style={[styles.floatingLabel, { color: colors.actionText }]}>New note</Text>
      </Pressable>

      <Modal visible={privacyOpen} animationType="none" presentationStyle="pageSheet" onRequestClose={() => setPrivacyOpen(false)}>
        <SafeAreaView style={[styles.privacyPage, { backgroundColor: colors.background }]}>
          <View style={styles.privacyHeader}>
            <Text accessibilityRole="header" style={[styles.privacyTitle, { color: colors.text }]}>Your notebook stays close</Text>
            <ActionButton label="Done" onPress={() => setPrivacyOpen(false)} compact variant="quiet" accessibilityLabel="Close privacy information" />
          </View>
          <Text style={[styles.privacyCopy, { color: colors.secondary }]}>Notes and search stay in local storage on this device. Quiet Notes does not use accounts, sync, analytics, or a remote AI service.</Text>
          <View style={[styles.privacyInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.privacyCardTitle, { color: colors.text }]}>On-device AI</Text>
            <Text style={[styles.privacyCopy, { color: colors.secondary }]}>Summaries and rewrites use Apple’s on-device model when your device supports Apple Intelligence. Your text is not sent to a server. AI can be unavailable on older devices or while the model is preparing.</Text>
          </View>
          <Text style={[styles.privacyFootnote, { color: colors.secondary }]}>The app is configured to encrypt its database, but that native setup has not yet been verified on device. Export and restore are not available. Device backup behavior also needs verification.</Text>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 124, gap: 18 },
  topRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, letterSpacing: 1.6, fontWeight: '700', marginBottom: 4 },
  heading: { fontFamily: 'Georgia', fontSize: 38, lineHeight: 45, letterSpacing: -0.7 },
  localBadge: { alignSelf: 'flex-start', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  localDot: { width: 7, height: 7, borderRadius: 5 }, localLabel: { fontSize: 13, fontWeight: '500' },
  searchBox: { minHeight: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchGlyph: { fontSize: 27, lineHeight: 30 }, searchInput: { flex: 1, minHeight: 48, fontSize: 16, paddingVertical: 9 },
  filterRow: { gap: 9, paddingRight: 22 },
  filterChip: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 22, borderWidth: 1 }, filterText: { fontSize: 14, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 1 }, sectionTitle: { fontSize: 20, fontWeight: '700' }, count: { fontSize: 14 },
  noteList: { gap: 12 }, noteCard: { borderRadius: 18, borderWidth: 1, minHeight: 142, paddingHorizontal: 17, paddingVertical: 15, gap: 9 },
  noteCardTop: { minHeight: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteMetadata: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  collectionLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' }, dotSeparator: { fontSize: 16 }, dateLabel: { fontSize: 12 },
  pinnedLabel: { fontSize: 11, marginLeft: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#88888818', overflow: 'hidden' },
  moreButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 }, moreGlyph: { fontSize: 17, letterSpacing: 1 },
  noteTitle: { fontSize: 18, fontWeight: '600', lineHeight: 24 }, notePreview: { fontSize: 14, lineHeight: 20 },
  emptyCard: { borderWidth: 1, borderRadius: 22, minHeight: 290, padding: 25, alignItems: 'center', justifyContent: 'center', gap: 13 },
  emptyMark: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }, emptyMarkText: { fontSize: 29 },
  emptyTitle: { fontSize: 21, lineHeight: 27, fontWeight: '600', textAlign: 'center' }, emptyMessage: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 3 },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 13 }, loadingText: { fontSize: 14 },
  errorCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 }, errorText: { fontSize: 14, lineHeight: 20 },
  footer: { borderTopWidth: 1, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between' }, footerText: { fontSize: 12 },
  floatingButton: { position: 'absolute', right: 22, bottom: 22, minHeight: 58, paddingHorizontal: 20, borderRadius: 29, elevation: 5, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  floatingGlyph: { fontSize: 26, lineHeight: 30, marginTop: -3 }, floatingLabel: { fontSize: 16, fontWeight: '600' },
  privacyPage: { flex: 1, padding: 24, gap: 18 }, privacyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  privacyTitle: { flex: 1, fontFamily: 'Georgia', fontSize: 27, lineHeight: 34 }, privacyCopy: { fontSize: 16, lineHeight: 24 },
  privacyInfoCard: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 9 }, privacyCardTitle: { fontSize: 17, fontWeight: '700' },
  privacyFootnote: { fontSize: 13, lineHeight: 19, marginTop: 'auto' },
});
