# Card format (v1)

One format for every card. Card **content** ships with the app in `data/`; your **progress** lives only on your phone and is keyed by the card's permanent `id`, so content can be rebuilt or improved without losing progress.

## IDs (never change once published)

`<level>-<type>-<number>` — type is `W` word, `K` kanji, `G` grammar.
Examples: `N1-W-0011`, `N2-K-0003`, `N1-G-0002`. The number is the item's position in its source list, zero-padded to 4 digits.

## Common fields

| field | meaning |
|---|---|
| `id` | permanent ID (above) |
| `no` | number within its level + type list |
| `level` | `N1` / `N2` |
| `type` | `word` / `kanji` / `grammar` |

## Word

| field | shown | source |
|---|---|---|
| `word`, `reading` | front | Open JLPT list |
| `en` | back, first | JMdict (jisho) |
| `jp`, `jpUrl` | back | デジタル大辞泉 (Kotobank), quoted |
| `img` | back, top (only if the exact Wikipedia article has one) | Wikipedia |
| `use` `{jp, en, src, url}` | back, 例文 | Japanese Wikipedia (+ my English 📝) |

## Kanji

| field | shown | source |
|---|---|---|
| `kanji`, `on[]`, `kun[]` | front | KANJIDIC (kanji-data) |
| `strokes`, `en` | back | KANJIDIC |
| `jp`, `jpUrl` | back | デジタル大辞泉［漢字項目］ |
| `words[] {w, r, m, ex}` | back, 言葉 (`ex` = short example, may be mine 📝) | Open JLPT lists |
| `use` | back, 例文 | Japanese Wikipedia |

## Grammar

| field | shown | source |
|---|---|---|
| `pattern`, `variants[]` | front | 日本語教師NET index |
| `en`, `imi[]`, `setsuzoku[]` | back | 日本語教師NET |
| `rei[] {jp, en, src, url}` | back, 例文 (tap for English) | 日本語教師NET, Tatoeba, Wikipedia |

## Display rules

- Front: headword + reading only. Everything else is behind a tap.
- The item being learned is **red** everywhere it appears (kanji cards: only the kanji itself).
- 🔊 reads the headword or a 例文 aloud with the phone's Japanese voice (offline, no audio files).
- Familiarity (0–5) is hidden by default; shown on demand.

## Progress (on the phone, never in `data/`)

`jc:profile:<level>:<type>:<no>` → `{familiarity, reviews, correct, incorrect, dueAt}`.
Same key parts as the `id`, so no migration is needed.

## Stories (Reading)

`data/stories/index.json` lists stories; each `data/stories/<id>.json` has
`{id, title, level, source, sentences[] {jp, en}}`. `source` says where it came from (e.g. "Written by Claude").
