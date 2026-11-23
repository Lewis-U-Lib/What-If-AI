"""The steel-blue and light palettes, derived at build time from the crimson stylesheets.

The stylesheets in src/css are written once, in crimson. The build passes each CSS bundle through
themed(): every crimson color literal becomes a custom property whose default is the original
literal and whose value under html[data-theme="blue"] is the same color moved to steel blue at the
same relative luminance, so every contrast ratio carries over. Nothing else in a rule changes, so the blue site is the crimson site with the hue
swapped: same layout, same cascade, same texture, and with no data-theme attribute the computed
styles are exactly what the source says.

What moves: reds and crimsons (hue 318 to 14 degrees), including the pink tints used for text
and the color columns of the SVG noise textures. What stays: gold, brass and incandescent
yellows, neutrals, and the reds that carry meaning (KEEP below: errors, cautions, the
"restrictive" end of the policy spectrum, the red lamp).

The light palette (html[data-theme="light"]) is derived the same way, from the same literals, but
it changes more than hue, so every color takes part, not only the crimsons. See paper() below:
luminance is turned over so that the dark plates become pale brushed metal and the pale lettering
becomes ink, with every contrast ratio at least what it was; gold lettering and gold lines become
Lewis crimson; cast shadows stay shadows. Print and forced-colors rules are left alone (they are
already dark-on-white), and a short list of parts (ISLANDS) keeps its crimson-palette colors.

    python3 tools/palette.py            # list every color moved to steel blue, most used first
    python3 tools/palette.py light      # list every color and its light-palette twin
"""
import colorsys
import hashlib
import pathlib
import re
import sys

HUE = 199 / 360          # the steel blue of the Library's panel (#2f5f75)
ATTR = 'html[data-theme="blue"]'
LIGHT_ATTR = 'html[data-theme="light"]'
PAPER_HUE = 44 / 360     # the warm off-white of the light plates (toward the panel's #cac7a7)
INK_HUE = 342 / 360      # Lewis crimson (#940731): what gold lettering and gold lines become on a light plate

# parts that keep their crimson-palette colors in the light palette: things that are objects with their own
# material or their own light rather than ink on the plate
ISLANDS = (
    ".fab-toggle",                 # the yellow-brass rivet that opens the help menu
)
# rules the light palette does not touch: they already put dark ink on white. Rules written for the light palette
# itself (any selector naming html[data-theme="light"], as in src/css/light.css) are left alone too.
UNTOUCHED = re.compile(r"@media[^{]*\b(print|forced-colors)\b")

# reds that mean something and therefore stay red in both palettes
KEEP = {
    "#ff9d9d",           # --bad: errors
    "#ffb3a1",           # caution borders: notes, boot errors, confirmations
    "#ff8f8f",           # the red lamp
    "#c7485f",           # the "restrictive" end of the policy spectrum
}

HEX = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])|(?<![\w-])white(?![\w-])")
FUNC = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)")
DATA_URL = re.compile(r'url\("data:[^"]*"\)')
SPLIT = re.compile(r'(/\*.*?\*/|url\("data:[^"]*"\)|"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\')', re.S)
MATRIX = re.compile(r"(<feColorMatrix values=')([^']*)(')")
NUM = r"-?(?:\d+\.?\d*|\.\d+)"


def luminance(r, g, b):
    """WCAG relative luminance of an sRGB color, each channel 0..1."""
    lin = lambda c: c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b)


def steel(r, g, b):
    """A crimson (r, g, b), each 0..1, as the steel blue of the same relative luminance; None for any other color.

    Matching luminance rather than lightness keeps every contrast ratio: text that passes on crimson passes
    by the same margin on steel. (At equal HSL lightness blue is far brighter than red, and gold text on
    it would fall below AA.)"""
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if not ((deg >= 318 or deg <= 14) and s > .12 and (max(r, g, b) - min(r, g, b)) * 255 >= 2):
        return None
    s2 = min(s * (.58 if l < .6 else .5), .6)      # steel is less saturated than crimson
    want, lo, hi = luminance(r, g, b), 0.0, 1.0
    for _ in range(40):                           # luminance rises with lightness: bisect
        mid = (lo + hi) / 2
        if luminance(*colorsys.hls_to_rgb(HUE, mid, s2)) < want:
            lo = mid
        else:
            hi = mid
    return colorsys.hls_to_rgb(HUE, (lo + hi) / 2, s2)


def _at(hue, sat, want):
    """The color of this hue and saturation whose relative luminance is `want`."""
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if luminance(*colorsys.hls_to_rgb(hue, mid, sat)) < want:
            lo = mid
        else:
            hi = mid
    return colorsys.hls_to_rgb(hue, (lo + hi) / 2, sat)


def family(r, g, b):
    """'neutral', 'crimson', 'gold' or 'other', by hue."""
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if max(r, g, b) - min(r, g, b) < 9 / 255 or s < .08:
        return "neutral"
    if deg >= 318 or deg <= 14:
        return "crimson"
    if 20 <= deg <= 66:
        return "gold"
    return "other"


def turned(lum):
    """Luminance turned over so that contrast is kept: for any two colors, the ratio between their turned
    luminances equals the ratio between the originals (black and white change places)."""
    return .0525 / (lum + .05) - .05


def paper(r, g, b, alpha=None, shadow=False, keep_hue=False):
    """The light-palette twin of a color (each channel 0..1): ((r, g, b), alpha), or None when it does not change.

    Outside shadows, luminance is turned over (see turned()), then:
      crimson, the plates and grounds   -> warm off-white metal, lifted further toward white. The lift only ever
                                           raises a pale ground, so dark ink on it gains contrast;
      gold, the lettering and lines     -> Lewis crimson;
      neutrals and every other hue      -> the same hue (white lettering becomes near-black ink, the reds that
                                           carry meaning stay red, green stays green).
    In a shadow (box-shadow, text-shadow, drop-shadow) a dark color is something casting shade and stays dark at
    about a third of its strength, which is what reads as the same depth on a pale ground; a white highlight
    stays white; a colored glow is turned over like lettering and softened."""
    fam, lum = family(r, g, b), luminance(r, g, b)
    if shadow:
        if lum < .06:
            return (.19, .16, .14), (None if alpha is None else round(alpha * .34, 3))
        if fam == "neutral":
            return None
        if fam == "crimson" and lum > .5:                       # a pale pink sheen: a highlight
            return (1, 1, 1), alpha
        alpha = None if alpha is None else round(alpha * .55, 3)
    want = turned(lum)
    if fam == "neutral":
        v = _at(0, 0, want)
        return v, alpha
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if fam == "crimson" and not keep_hue:
        t = min(max((want - .15) / .45, 0), 1)
        t = t * t * (3 - 2 * t)
        want += (1 - want) * .5 * t
        return _at(PAPER_HUE, .22 if want > .5 else .12, want), alpha
    if fam == "gold":
        # ink no darker than the deep maroon #6f0525, so it still reads as crimson rather than black
        if max(r, g, b) - min(r, g, b) < .3 and lum > .6:       # cream and ivory lettering: ink, barely warm
            return _at(INK_HUE, .3, want), alpha
        want = max(want, .034)
        return _at(INK_HUE, .9 if want < .12 else .62, want), alpha
    return _at(h, min(s, .7), want), alpha


def _rgb(text):
    if text.lower() == "white":
        return (1.0, 1.0, 1.0)
    h = text.lower()
    full = h if len(h) == 7 else "#" + "".join(c * 2 for c in h[1:])
    return tuple(int(full[i:i + 2], 16) / 255 for i in (1, 3, 5))


def _light_hex(text, shadow):
    out = paper(*_rgb(text), shadow=shadow, keep_hue=text.lower() in KEEP)
    if out is None:
        return None
    (r, g, b), _ = out
    return "#%02x%02x%02x" % tuple(round(x * 255) for x in (r, g, b))


def _light_func(m, shadow):
    a = None if m.group(4) is None else float(m.group(4))
    out = paper(*(int(m.group(i)) / 255 for i in (1, 2, 3)), alpha=a, shadow=shadow)
    if out is None:
        return None
    (r, g, b), a2 = out
    r, g, b = (round(x * 255) for x in (r, g, b))
    if a2 is None:
        return f"rgb({r},{g},{b})"
    num = (m.group(4) if a2 == a else ("%.3f" % a2).rstrip("0").rstrip(".").replace("0.", ".", 1) if a2 < 1 else "1") or "0"
    return f"rgba({r},{g},{b},{num})"


def _light_texture(url):
    """A data: URL with its colors given their light-palette twins, or None when it has none."""
    def matrix(m):
        vals = re.findall(NUM, m.group(2))
        if len(vals) != 20 or any(float(vals[i]) for i in (0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13)):
            return m.group(0)
        (c, _) = paper(*(min(max(float(vals[i]), 0), 1) for i in (4, 9, 14)))
        num = lambda x: ("%.2f" % x).rstrip("0").rstrip(".").replace("0.", ".") or "0"
        rows = [f"0 0 0 0 {num(x)}" for x in c] + [" ".join(vals[15:])]
        return m.group(1) + "  ".join(rows) + m.group(3)
    out = MATRIX.sub(matrix, url)
    out = re.sub(r"(%23|#)((?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-zA-Z])",
                 lambda m: m.group(1) + (_light_hex("#" + m.group(2), False) or "#" + m.group(2))[1:], out)
    return None if out == url else out


SHADOW_PROP = re.compile(r"(?:^|[;{\s])(box-shadow|text-shadow)\s*$")
SHADOW_SHAPE = re.compile(r"(?:^|,)\s*(?:inset\s+)?-?[\d.]+(?:px|em|rem)?\s+-?[\d.]+(?:px|em|rem)?\s+[^,]*(?:rgba?\(|#)")


def _hex(text):
    if text.lower() == "white":
        return None
    h = text.lower()
    full = h if len(h) == 7 else "#" + "".join(c * 2 for c in h[1:])
    if full in KEEP:
        return None
    c = steel(*(int(full[i:i + 2], 16) / 255 for i in (1, 3, 5)))
    return None if c is None else "#%02x%02x%02x" % tuple(round(x * 255) for x in c)


def _func(m):
    c = steel(*(int(m.group(i)) / 255 for i in (1, 2, 3)))
    if c is None:
        return None
    r, g, b = (round(x * 255) for x in c)
    return f"rgb({r},{g},{b})" if m.group(4) is None else f"rgba({r},{g},{b},{m.group(4)})"


def _texture(url):
    """A data: URL with its colors translated, or None when it has none to translate."""
    def matrix(m):
        vals = re.findall(NUM, m.group(2))
        if len(vals) != 20 or any(float(vals[i]) for i in (0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13)):
            return m.group(0)             # not a flat color: leave it
        c = steel(*(min(max(float(vals[i]), 0), 1) for i in (4, 9, 14)))
        if c is None:
            return m.group(0)
        num = lambda x: ("%.2f" % x).rstrip("0").rstrip(".").replace("0.", ".") or "0"
        rows = [f"0 0 0 0 {num(x)}" for x in c] + [" ".join(vals[15:])]
        return m.group(1) + "  ".join(rows) + m.group(3)
    out = MATRIX.sub(matrix, url)
    out = re.sub(r"(%23|#)((?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-zA-Z])",
                 lambda m: m.group(1) + (_hex("#" + m.group(2)) or "#" + m.group(2))[1:], out)
    return None if out == url else out


def token(literal):
    return "--c-" + hashlib.sha1(literal.encode("utf-8")).hexdigest()[:7]


def themed(css, found=None, light_found=None):
    """css with each translated literal replaced by var(--c-…), preceded by the three sets of definitions."""
    pairs = {}                            # token -> (crimson literal, blue literal, light literal), in order of first use

    def use(crimson, blue, light, usual=True):
        """The var() for a literal. `usual` is false where the context changed the translation (a shadow, a rule
        the light palette leaves alone), and those get a token of their own."""
        if blue is None and light is None:
            return None
        if found is not None and blue is not None:
            found[crimson] = (blue, found.get(crimson, (blue, 0))[1] + 1)
        if light_found is not None and light is not None and usual:      # as lettering or ground, not as a shadow
            light_found[crimson] = (light, light_found.get(crimson, (light, 0))[1] + 1)
        values = (crimson, blue or crimson, light or crimson)
        name = token(crimson if usual else "|".join(values))
        if pairs.setdefault(name, values) != values:
            raise SystemExit(f"palette: two colors share the token {name}")
        return f"var({name})"

    def colors(text, shadow, untouched, blue_too):
        def func(m):
            lit = re.sub(r"\s+", "", m.group(0))
            blue = _func(m) if blue_too else None
            light = None if untouched else _light_func(m, shadow)
            return use(lit, blue, light, usual=blue_too and not untouched and not shadow) or m.group(0)

        def hexa(m):
            lit = m.group(0).lower()
            blue = _hex(lit) if blue_too else None
            light = None if untouched else _light_hex(lit, shadow)
            return use(lit, blue, light, usual=blue_too and not untouched and not shadow) or m.group(0)
        return HEX.sub(hexa, FUNC.sub(func, text))

    state = {"prop": "", "open": False}    # the declaration a value belongs to, carried across strings and data: URLs

    def value(prop, text, untouched, blue_too=True):
        shadow = (prop in ("box-shadow", "text-shadow", "filter", "-webkit-filter")
                  or (prop.startswith("--") and bool(SHADOW_SHAPE.search(text))))
        return colors(text, shadow, untouched, blue_too)

    def block(text, untouched):
        """Translate declaration values only, so an id selector such as #fab is never read as a color."""
        out, pos = [], 0
        if state["open"]:                 # the rest of a value that a string or data: URL interrupted (light palette only,
            end = re.search(r"[;{}]", text)   # so the steel-blue pages stay exactly as they were)
            stop = end.start() if end else len(text)
            out.append(value(state["prop"], text[:stop], untouched, blue_too=False))
            pos = stop
            state["open"] = end is None
        base = pos
        for m in re.finditer(r"(:)([^;{}]*)", text[base:]):
            start = base + m.start()
            before = text[:start]
            name = re.search(r"([\w-]+)\s*$", before)
            prop = name.group(1) if name else ""
            out.append(text[pos:start] + ":" + value(prop, m.group(2), untouched))
            pos = base + m.end()
            state["prop"], state["open"] = prop, pos == len(text)
        out.append(text[pos:])
        return "".join(out)

    out, stack, recent = [], [], ""
    roots, root_from = [], None           # the :root rules' declarations (as written to out), re-declared on the islands
    for part in SPLIT.split(css):
        if not part:
            continue
        untouched = any(stack)
        if part.startswith("/*"):
            out.append(part)
        elif part[0] in "\"'":
            out.append(part)
            recent += part                # an attribute selector's value is part of the prelude
        elif part.startswith('url("data:'):
            blue, light = _texture(part), (None if untouched else _light_texture(part))
            out.append(use(part, blue, light, usual=not untouched) or part)
        else:
            # selectors end at "{"; everything from there to "}" is declarations (or a nested rule's selector)
            pieces = re.split(r"([{}])", part)
            for i, piece in enumerate(pieces):
                if piece == "{":
                    stack.append(bool(stack and stack[-1]) or bool(UNTOUCHED.search(recent)) or LIGHT_ATTR in recent)
                    out.append(piece)
                    if len(stack) == 1 and recent.strip() == ":root":
                        root_from = len(out)
                    recent, state["open"] = "", False
                    continue
                if piece == "}":
                    if stack:
                        stack.pop()
                    if not stack and root_from is not None:
                        roots.append(re.sub(r"\s*\n\s*", " ", re.sub(r"/\*.*?\*/", "", "".join(out[root_from:]), flags=re.S)).strip().rstrip(";"))
                        root_from = None
                    recent, state["open"] = "", False
                    out.append(piece)
                    continue
                untouched = any(stack)
                nxt = next((p for p in pieces[i + 1:] if p in ("{", "}")), None)
                # text followed by "{" is a selector or at-rule prelude, unless it also holds earlier declarations
                if nxt == "{":
                    head, sep, tail = piece.rpartition(";")
                    out.append(block(head, untouched) + sep + tail)
                    recent += tail
                    state["open"] = False
                else:
                    out.append(block(piece, untouched))
                    recent += piece.rpartition(";")[2]
    body = "".join(out)
    if not pairs:
        return css
    crimson = ";".join(f"{k}:{v[0]}" for k, v in pairs.items())
    blue = ";".join(f"{k}:{v[1]}" for k, v in pairs.items() if v[1] != v[0])
    light = ";".join(f"{k}:{v[2]}" for k, v in pairs.items() if v[2] != v[0])
    # custom properties take their value where they are declared, so an island also re-declares the :root ones
    island = ";".join([f"{k}:{v[0]}" for k, v in pairs.items() if v[2] != v[0]] + [r for r in roots if r])
    head = ("/* palette tokens, written by tools/palette.py: the literals of this bundle, their steel-blue twins, their light-palette twins, and the parts that keep the first set in the light palette */\n"
            f":root{{{crimson}}}\n{ATTR}{{{blue}}}\n{LIGHT_ATTR}{{{light}}}\n"
            f"{LIGHT_ATTR} :is({','.join(ISLANDS)}){{{island}}}\n")
    return head + body


def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    found, light = {}, {}
    for f in sorted((root / "src" / "css").glob("*.css")):
        themed(f.read_text(encoding="utf-8"), found, light)
    if sys.argv[1:] == ["light"]:
        found = light
    for crimson, (blue, n) in sorted(found.items(), key=lambda kv: -kv[1][1]):
        print(f"{n:4}  {crimson[:60]:<60} {blue[:60]}")
    print(len(found), "colors translated")


if __name__ == "__main__":
    sys.exit(main())
