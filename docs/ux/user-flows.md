# User flows and screen states

## Notes list

The home route shows recent notes with title, excerpt, collection, pinned state, and modified time. Users can search title/body, filter by collection, show pinned notes, create a note, open a note, move/pin it, and delete it after native confirmation. First load, database error/retry, true empty notebook, and no search results have distinct copy and actions. The list continues to work offline.

## Note editor

The editor route exposes title, collection, pin, formatting, annotation review, and explicit AI actions. Save state is visible as `Saving`, `Saved`, or an error with retry; failed saves keep the draft on screen. A pending debounce is flushed before leaving. The 10tap editor uses its bundled local content view; link and image extensions are omitted. The toolbar has labels for bold, italic, heading, list, highlight, undo/redo, comments, and AI. A keyboard-aware layout keeps the title, editor, and primary actions reachable.

## Comments and anchors

The user selects text and chooses `Comment`. With no selection, the app explains that text must be selected first. A dialog shows a compact, independently scrollable preview of the selected passage, a multiline comment field, and a pinned Save action. The form scrolls when the keyboard reduces the available height, and the Save action remains above the keyboard. Tapping the dimmed backdrop outside the dialog, the Cancel button, or system Back closes the dialog and discards the unsaved comment draft. Saving stores the quote/context anchor with the note; a save failure leaves the dialog open with the draft intact. The review list labels each comment `In text`, `Needs review`, or `Quote no longer found`; attached comments have a `Show in note` action that selects and returns focus to the mapped source range. It preserves quote and comment text when edits cause ambiguity or loss. Deleting a comment asks for confirmation; it does not silently remove editor formatting.

## Local AI

Summarize, rewrite selection, and key points are explicit actions. The app checks runtime availability. If unavailable, it explains the reason where known and leaves editing/search usable. While generating, the UI says the request is on-device, exposes a cancel action, and reports errors without changing the note. Cancellation discards partial output. A review screen offers Insert/Replace and Discard; summary/key points append only after approval, and rewrite replaces the selected text only after approval.

## Errors and accessibility

Database open/migration and save errors have retry paths when retry can help. If the current build does not include SQLCipher, the startup state explains that an iOS or Android development build with SQLCipher is required and does not offer a retry. Web previews are blocked before the database is opened; the app never falls back to plaintext note storage. Search no-results is distinct from first-run empty. AI unavailable/busy/cancelled/error states are visible. Deletion is confirmed. Controls have accessible names, roles, state, and stable identifiers; status is text as well as color. Touch targets are at least 44 points. Native navigation, safe areas, system text scaling, dark appearance, VoiceOver order, reduced motion, keyboard presentation/dismissal, and hardware keyboard behavior must be checked on iOS devices before release.
