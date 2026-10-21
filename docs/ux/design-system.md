# Design system

## Direction

Quiet Notes uses a warm paper surface, restrained forest-green actions, and a soft yellow annotation highlight. Lists emphasize title, excerpt, collection, and recency. Editor chrome stays secondary to the writing surface. The existing palette in `src/core/theme.ts` is the single color source of truth; implementation should extend it rather than introduce a second token system.

## Tokens

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#F6F4EF` | `#111915` |
| Surface | `#FFFEFB` | `#1B241F` |
| Primary text | `#24312A` | `#EDF1EB` |
| Secondary text | `#707A72` | `#A8B4AA` |
| Action | `#285B47` | `#A6D3B8` |
| Highlight | `#F4D980` | `#806B30` |
| Divider | `#E7E4DC` | `#344039` |

Use system sans-serif for controls and reading, with restrained system serif for the notebook title. Keep spacing on a 4-point base; standard screen inset is 20 points, list rows are grouped with hairlines, and reusable buttons have at least 44-point targets. Avoid decorative shadows and animation.

## Interaction and accessibility

Use the Expo Router native stack and intercept back actions to flush pending saves. A custom editor header shows save status and a save-aware back control. Use native page sheets for comment composition and AI review. Confirm deletion because it is irreversible within the app. Search, selected filters, pinned state, and save/AI progress are communicated through labels and accessibility state, not color alone. Preserve Dynamic Type, safe areas, keyboard access, VoiceOver labels/focus order, and dark appearance.
