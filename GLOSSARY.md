# Glossary

Words people and AIs read: site copy, docs, the AI prompt, skill instructions, parser errors and exported files.

| Term             | Meaning                                                                           | Avoid               |
| ---------------- | --------------------------------------------------------------------------------- | ------------------- |
| **presentation** | The whole thing: one Markdown file, its settings and every slide in it            | deck, slide deck    |
| **slide**        | One page of a presentation, between two `---` lines                               |                     |
| **slides**       | Casual plural for a presentation's content ("paste the slides", "Update slides")  |                     |
| **widget**       | The one supporting block a slide may have: steps, chart, table, flow and the rest |                     |
| **download**     | Saving a presentation as one HTML file                                            | export (in site UI) |
| **present**      | Showing slides full screen                                                        |                     |

Some code still says `Deck` (`parseDeck`, `lib/deck/`, `deck-html.tsx`). Those names are internal, but nothing a person or an AI reads should say "deck". Skill descriptions may list "deck" only as a trigger word, since some people do say it.
