import json
import subprocess
import sys
from io import BytesIO
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "scripts/fonts"
OUT = ROOT / "public/fonts"
MANIFEST = ROOT / "lib/presentation/font-files.json"

LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
CYRILLIC = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"
CORE = "U+0020-007E,U+00A0,U+2013-2014,U+2018-2019,U+201C-201D,U+2026"

FONTS = [
    ("inter", LATIN, (400, 900)),
    ("inter-cyrillic", CYRILLIC, (400, 900)),
    ("figtree", LATIN, None),
    ("golos-text", LATIN, (400, 900)),
    ("golos-text-cyrillic", CYRILLIC, (400, 900)),
    ("bricolage-grotesque", LATIN, None),
    ("space-grotesk", LATIN, None),
    ("onest-cyrillic", CYRILLIC, (400, 900)),
    ("archivo-expanded", LATIN, None),
    ("unbounded-cyrillic", CYRILLIC, (400, 900)),
]

FEATURES = ["calt", "ccmp", "clig", "curs", "kern", "liga", "mark", "mkmk", "rlig", "rvrn"]
DROPPED_TABLES = ["STAT", "vhea", "vmtx", "VVAR"]
METRICS = {
    "head": ["unitsPerEm"],
    "hhea": ["ascent", "descent", "lineGap"],
    "OS/2": [
        "sTypoAscender",
        "sTypoDescender",
        "sTypoLineGap",
        "usWinAscent",
        "usWinDescent",
        "fsSelection",
        "sxHeight",
        "sCapHeight",
    ],
}


def main():
    manifest = {}
    for name, script_range, limits in FONTS:
        source = TTFont(SOURCES / f"{name}.woff2")
        weights = limits or axis_range(source)
        chars = set(source.getBestCmap()) & codepoints(script_range)
        outputs = (
            {f"{name}.woff2": chars}
            if script_range == CYRILLIC
            else {f"{name}-core.woff2": chars & codepoints(CORE), f"{name}-extended.woff2": chars}
        )
        for file, keep in outputs.items():
            font = build(SOURCES / f"{name}.woff2", keep, weights)
            font.save(OUT / file)
            check(OUT / file, source, keep, weights)
            manifest[file] = {"weights": f"{weights[0]} {weights[1]}", "range": unicode_range(keep)}
            print(f"{file}: {(OUT / file).stat().st_size} bytes, {len(keep)} characters")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    subprocess.run(["pnpm", "exec", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=True)


def build(path, keep, weights):
    font = TTFont(path, recalcTimestamp=False)
    if weights != axis_range(font):
        instanced = BytesIO()
        variable = instantiateVariableFont(font, {"wght": weights})
        variable.recalcTimestamp = False
        variable.save(instanced)
        font = TTFont(instanced, recalcTimestamp=False)
    options = Options()
    options.layout_features = FEATURES
    options.hinting = True
    options.glyph_names = False
    options.notdef_outline = False
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.drop_tables += DROPPED_TABLES
    options.flavor = "woff2"
    subsetter = Subsetter(options)
    subsetter.populate(unicodes=keep)
    subsetter.subset(font)
    return font


def check(path, source, keep, weights):
    font = TTFont(path)
    fail = lambda message: sys.exit(f"{path.name}: {message}")
    if set(font.getBestCmap()) != keep:
        fail("characters differ from the plan")
    axes = [(a.axisTag, a.minValue, a.maxValue) for a in font["fvar"].axes]
    if axes != [("wght", *weights)]:
        fail(f"axes are {axes}")
    features = set()
    for table in ("GSUB", "GPOS"):
        if table in font and font[table].table.FeatureList:
            features |= {r.FeatureTag for r in font[table].table.FeatureList.FeatureRecord}
    if not features <= set(FEATURES):
        fail(f"kept unused features {sorted(features - set(FEATURES))}")
    for table, fields in METRICS.items():
        for field in fields:
            if getattr(font[table], field) != getattr(source[table], field):
                fail(f"{table}.{field} changed")
    widths = {g: font["hmtx"][g][0] for g in font.getGlyphOrder()}
    cmap, original = font.getBestCmap(), source.getBestCmap()
    for char in keep:
        if widths[cmap[char]] != source["hmtx"][original[char]][0] and weights[0] <= default(source) <= weights[1]:
            fail(f"advance of U+{char:04X} changed")


def axis_range(font):
    axis = next(a for a in font["fvar"].axes if a.axisTag == "wght")
    return (int(axis.minValue), int(axis.maxValue))


def default(font):
    return next(a.defaultValue for a in font["fvar"].axes if a.axisTag == "wght")


def codepoints(text):
    chars = set()
    for part in text.split(","):
        start, _, end = part.removeprefix("U+").partition("-")
        chars.update(range(int(start, 16), int(end or start, 16) + 1))
    return chars


def unicode_range(chars):
    ranges, ordered = [], sorted(chars)
    for char in ordered:
        if ranges and ranges[-1][1] == char - 1:
            ranges[-1][1] = char
        else:
            ranges.append([char, char])
    return ",".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in ranges)


if __name__ == "__main__":
    main()
