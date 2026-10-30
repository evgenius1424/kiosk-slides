# Fonts

Every font here is licensed under the [SIL Open Font License 1.1](https://openfontlicense.org). The originals are the Google Fonts subsets in [`scripts/fonts/`](../../scripts/fonts), cut down further by [`scripts/subset-fonts.py`](../../scripts/subset-fonts.py). None of them has a Reserved Font Name, so the subsets keep their names.

Each Latin font comes as two files. `-core` holds ASCII and the common punctuation (curly quotes, dashes, ellipsis) and is preloaded. `-extended` holds every character of the original and is used instead of the core file only when the text needs one of its other characters, so kerning between accented and plain letters stays as it was. `-cyrillic` files hold only the Cyrillic letters and load only when the text uses them.

| Files                   | Font                | Copyright                                                                                             |
| ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `inter-*`               | Inter               | The Inter Project Authors (https://github.com/rsms/inter)                                             |
| `figtree-*`             | Figtree             | The Figtree Project Authors (https://github.com/erikdkennedy/figtree)                                 |
| `bricolage-grotesque-*` | Bricolage Grotesque | The Bricolage Grotesque Project Authors (https://github.com/ateliertriay/bricolage)                   |
| `space-grotesk-*`       | Space Grotesk       | The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk)                   |
| `archivo-expanded-*`    | Archivo Expanded    | The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo); the Archivo width-125 instance |
| `golos-text-*`          | Golos Text          | The Golos Text Project Authors (https://github.com/googlefonts/golos-text)                            |
| `onest-cyrillic`        | Onest               | The Onest Project Authors (https://github.com/simpals/onest)                                          |
| `unbounded-cyrillic`    | Unbounded           | The Unbounded Project Authors (https://github.com/googlefonts/unbounded)                              |

Figtree uses Golos Text for Cyrillic, Bricolage Grotesque and Space Grotesk use Onest, and Archivo Expanded uses Unbounded.
