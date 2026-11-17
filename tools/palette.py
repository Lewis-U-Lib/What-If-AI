"""The palette family, derived at build time from the crimson stylesheets.

The stylesheets in src/css are written once, in crimson. The build passes each CSS bundle through
themed(): every color literal that some palette changes becomes a custom property whose default is
the original literal and whose value under html[data-theme="<name>"] is that color's twin in the
palette. Nothing else in a rule changes, so every palette is the crimson site with its colors
swapped: same layout, same cascade, same texture grain, and with no data-theme attribute the
computed styles are exactly what the source says.

Steel blue, the first palette, moves reds and crimsons (hue 318 to 14 degrees, including the pink
tints used for text and the color columns of the SVG noise textures) to steel blue at the same
relative luminance, so every contrast ratio carries over. Gold, brass and incandescent yellows,
neutrals, and the reds that carry meaning (KEEP below: errors, cautions, the "restrictive" end of
the policy spectrum, the red lamp) stay. The seven palettes after it are described further down.

    python3 tools/palette.py            # list every color steel blue translates, most used first
"""
import colorsys
import hashlib
import pathlib
import re
import sys

HUE = 199 / 360          # the steel blue of the Library's panel (#2f5f75)

# reds that mean something and therefore stay red in both palettes
KEEP = {
    "#ff9d9d",           # --bad: errors
    "#ffb3a1",           # caution borders: notes, boot errors, confirmations
    "#ff8f8f",           # the red lamp
    "#c7485f",           # the "restrictive" end of the policy spectrum
}

HEX = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])")
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


def _hex(text):
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


# ════════════════════════════════════════════════════════════
# The palette family: seven more palettes from the Library's color panel.
#
# Blue (above) is a hue swap at equal luminance, so nothing but the hue changes. The palettes below
# are built around a named color that the plates (header, panel heads, footer) take exactly. Six of
# the seven are too light for white text, so they are "light" palettes: the page is the crimson
# page with its lightness turned over. Dark surfaces become tints and shades of the named color,
# light text becomes dark ink, and recessed wells become pale insets. Gold fittings and yellow
# lights would wash out on most of these plates, so each palette names an accent (what gold
# becomes: links, labels, buttons, hairlines) and a glow (what the incandescent yellows become).
# Charcoal is dark enough to stay a "dark" palette: lifted steel with the lighter house golds.
#
# A color's new value depends on what it is used for, which is read from the declaration it sits
# in: text (color, fill, stroke, outline…), a shadow (box-shadow, filter), a text shadow, or a
# fill (everything else), with a few custom properties assigned by name (ROLE_VARS).
# ════════════════════════════════════════════════════════════

def _rgb(hexs):
    return tuple(int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5))


def _with_lum(h, s, want):
    """The color of hue h and saturation s whose relative luminance is want."""
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if luminance(*colorsys.hls_to_rgb(h, mid, s)) < want:
            lo = mid
        else:
            hi = mid
    return colorsys.hls_to_rgb(h, (lo + hi) / 2, s)


L3 = luminance(*_rgb("#6c1221"))          # --steel-3, the plate: the lightest crimson surface
GOLD_L = luminance(*_rgb("#debb70"))

INK_PROPS = {"color", "fill", "stroke", "caret-color", "-webkit-text-fill-color", "text-decoration-color",
             "text-decoration", "outline", "outline-color", "border-left-color-ink"}
SHADOW_PROPS = {"box-shadow", "filter", "-webkit-filter"}
SKIP_PROPS = {"mask", "mask-image", "-webkit-mask", "-webkit-mask-image"}
ROLE_VARS = {
    "ink": {"--white", "--off-white", "--muted", "--body", "--ink", "--ink-2", "--ink-3", "--cream", "--cream-lt",
            "--focus", "--ok", "--bad", "--glass-ink"},
    "onaccent": {"--brass-ink"},
    "decor": {"--rivet-dome", "--rivet-hollow", "--rivet-sm", "--seam", "--lamp-off"},
    "glow": {"--inc-core", "--inc-hot", "--inc-bulb", "--inc-amber", "--inc-ember", "--inc-lit", "--inc-pilot",
             "--inc-halo", "--inc-halo-pilot", "--inc-glow", "--fil", "--edison", "--lamp-amber"},
    "shadow": {"--shadow", "--shadow-sm", "--bevel"},
    "keep": {"--paper", "--lamp-green", "--lamp-red"},
}
VAR_ROLE = {v: role for role, names in ROLE_VARS.items() for v in names}
ON_BRASS = (0x2a, 0x06, 0x10)             # the one dark ink that always sits on brass


def role_of(prop):
    prop = prop.strip().lower()
    if prop in SKIP_PROPS:
        return "skip"
    if prop.startswith("--"):
        if prop.startswith("--swatch"):
            return "keep"                 # the picker's swatches show each palette's own color in every palette
        return VAR_ROLE.get(prop, "tx" if prop.startswith("--tx-") else "fill")
    if prop in INK_PROPS:
        return "ink"
    if prop == "text-shadow":
        return "tshadow"
    if prop in SHADOW_PROPS:
        return "shadow"
    if prop.startswith("border"):
        return "line"
    return "fill"


def family(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if s <= .12 or (max(r, g, b) - min(r, g, b)) * 255 < 2:
        return "neutral"
    if deg >= 318 or deg <= 14:
        return "crimson"
    if 28 <= deg <= 58:
        return "glow" if s >= .9 else "gold"
    return "other"


class Light:
    """A palette whose plates are a color too light for white text: the crimson page with its lightness turned over."""
    tone = "light"

    def __init__(self, name, label, base, accent, glow=None, ink=None, ground=.45, glow_l=1.0):
        self.name, self.label, self.base = name, label, base
        self.h, _, self.s = colorsys.rgb_to_hls(*_rgb(base))
        self.lp = luminance(*_rgb(base))
        self.dp = 1 - self.lp
        self.ground, self.glow_l = ground, glow_l
        self.dark = self.surface_lum(L3 * 3.5)                      # the darkest shade a surface takes
        self.bound = (self.dark + .05) / 4.75 - .05                 # the lightest ink that still reads on it
        ah, _, asat = colorsys.rgb_to_hls(*_rgb(accent))
        self.acc_h, self.acc_s = ah, asat
        self.acc_l = min(luminance(*_rgb(accent)), self.bound)
        self.ink_h, self.ink_s = (colorsys.rgb_to_hls(*_rgb(ink))[0], .4) if ink else (ah, .45)
        self.glow_h = None if glow is None else colorsys.rgb_to_hls(*_rgb(glow))[0]
        self.bar = "#%02x%02x%02x" % tuple(round(x * 255) for x in _with_lum(self.h, self.s * .9, self.lp * .8))

    def surface_lum(self, lum):
        t = lum / L3
        if t <= 1:
            return 1 - self.dp * (self.ground + (1 - self.ground) * t)
        return 1 - (self.dp + (1 - self.dp) * .15 * min((t - 1) / 2.5, 1))

    def surface(self, lum):
        t = min(lum / L3, 1)
        return _with_lum(self.h, self.s * (.6 + .4 * t), self.surface_lum(lum))

    def ink(self, lum):
        """Dark ink for what was light text: white becomes the strongest ink, the pink tints a slightly softer one."""
        return _with_lum(self.ink_h, self.ink_s, min(.006 + (1 - lum) * .05, self.bound))

    def accent(self, lum):
        return _with_lum(self.acc_h, self.acc_s, min(self.acc_l * (lum / GOLD_L) ** .8, .5))

    def glow(self, r, g, b):
        if self.glow_h is None:
            return r, g, b
        _, l, s = colorsys.rgb_to_hls(r, g, b)
        return colorsys.hls_to_rgb(self.glow_h, l if l > .9 else l * self.glow_l, s)

    def tint(self, r, g, b):
        """The same lightness in the palette's own hue: bolts, seams and highlights keep their modeling."""
        _, _, s = colorsys.rgb_to_hls(r, g, b)
        return _with_lum(self.h, min(s, self.s) * .5, luminance(r, g, b))

    def color(self, r, g, b, a, role):
        """(r, g, b, a) in this palette, or None to leave it as written. a is None for an opaque color."""
        lum, fam = luminance(r, g, b), family(r, g, b)
        if role in ("skip", "keep"):
            return None
        if tuple(round(x * 255) for x in (r, g, b)) == ON_BRASS or role == "onaccent":
            return _with_lum(self.h, self.s * .5, .9) + (a,)          # pale text on what used to be brass
        if role == "glow":
            if fam == "crimson" or (fam == "neutral" and lum < .05):   # the dark ring around a lamp
                return _with_lum(self.ink_h, self.ink_s, .01) + (a,)
            return self.glow(r, g, b) + (a,)
        if role == "decor":
            return (self.tint(r, g, b) + (a,)) if fam == "crimson" else None
        if role == "ink":
            if fam == "gold" or fam == "glow":                         # gold labels and cream highlights: the accent
                return _with_lum(self.acc_h, self.acc_s, self.acc_l) + (a,)
            if fam == "other":                                         # ok green, error red: same hue, dark enough to read
                h, _, s = colorsys.rgb_to_hls(r, g, b)
                return _with_lum(h, min(1, s * 1.1), min(self.bound, .05)) + (a,)
            if lum >= .18:
                return self.ink(lum) + (a,)
            return _with_lum(self.ink_h, self.ink_s, min(lum, self.bound)) + (a,)
        if role == "tshadow":
            if fam == "gold" or fam == "glow":
                return self.accent(lum) + (a,)
            if lum < .18:                                              # a dark edge under light letters becomes a light one under dark letters
                return (1.0, 1.0, 1.0, round((a if a is not None else 1) * .5, 3))
            return _with_lum(self.ink_h, self.ink_s, .02) + (a,)
        # fills and shadows
        if fam == "gold":
            return self.accent(lum) + (a,)
        if fam == "glow":
            return self.glow(r, g, b) + (a,)
        if fam == "neutral":
            if lum < .05 and a is not None:
                if role == "fill" and a >= .2:                         # a darkened chip or well: a pale inset, like the wells below
                    return _with_lum(self.h, self.s * .35, 1 - self.dp * .2) + (round(a * .85, 3),)
                k = .55 if role == "shadow" else .6 if role == "line" else .5   # black shading reads heavier on a light page
                return _with_lum(self.ink_h, self.ink_s, .012) + (round(a * k, 3),)
            return None
        if fam == "other":
            return None
        if role == "shadow":
            return (self.tint(r, g, b) + (a,)) if lum > .13 else _with_lum(self.ink_h, self.ink_s, .012) + (None if a is None else round(a * .55, 3),)
        if lum > .13:                                                  # pinks and highlights: keep the lightness
            return self.tint(r, g, b) + (a,)
        if lum < .004 and a is not None:                               # a dark well becomes a pale inset
            return _with_lum(self.h, self.s * .35, 1 - self.dp * .2) + (round(a * .85, 3),)
        return self.surface(lum) + (a,)

    def texture(self, r, g, b):
        """A noise texture's flat color: light strokes stay light, dark ones become a shade of the plate."""
        lum = luminance(r, g, b)
        if lum > .2:
            return self.tint(r, g, b)
        return _with_lum(self.h, self.s * .75, self.lp * (.68 + .22 * self.lp))   # the paler the plate, the gentler its stains


class Dark:
    """A palette dark enough for light text: the crimson surfaces in another hue, lifted toward the named color."""
    tone = "dark"

    def __init__(self, name, label, base, accent=None, glow=None, gain=1.0):
        self.name, self.label, self.base, self.gain = name, label, base, gain
        self.h, _, self.s = colorsys.rgb_to_hls(*_rgb(base))
        self.acc = None if accent is None else colorsys.rgb_to_hls(*_rgb(accent))
        self.acc_gain = 1.0 if accent is None else max(1.0, luminance(*_rgb(accent)) / GOLD_L)
        self.glow_h = None if glow is None else colorsys.rgb_to_hls(*_rgb(glow))[0]
        self.bar = "#%02x%02x%02x" % tuple(round(x * 255) for x in _with_lum(self.h, self.s, L3 * gain * .6))

    def color(self, r, g, b, a, role):
        lum, fam = luminance(r, g, b), family(r, g, b)
        if role in ("skip", "keep") or tuple(round(x * 255) for x in (r, g, b)) == ON_BRASS or role == "onaccent":
            return None
        if fam == "crimson":
            if "#%02x%02x%02x" % tuple(round(x * 255) for x in (r, g, b)) in KEEP:
                return None
            _, _, s = colorsys.rgb_to_hls(r, g, b)
            k = self.gain if lum < .12 else 1 + (self.gain - 1) * max(0, (.3 - lum) / .18)
            if role in ("decor", "ink", "tshadow") or lum < .004:
                k = 1
            return _with_lum(self.h, min(s * .5, self.s * 1.6), min(lum * k, 1)) + (a,)
        if fam == "gold" and self.acc is not None:
            return _with_lum(self.acc[0], self.acc[2] * .85, min(lum * self.acc_gain, .92)) + (a,)
        if fam == "glow" and self.glow_h is not None and role != "ink":
            _, l, s = colorsys.rgb_to_hls(r, g, b)
            return colorsys.hls_to_rgb(self.glow_h, l, s) + (a,)
        return None

    def texture(self, r, g, b):
        c = self.color(r, g, b, None, "decor")
        return None if c is None else c[:3]


class Blue:
    """The first palette: steel() above, a hue swap at equal luminance whatever the color is used for."""
    name, label, base, tone, bar = "blue", "Steel blue", "#2f5f75", "dark", "#163442"

    def color(self, r, g, b, a, role):
        if "#%02x%02x%02x" % tuple(round(x * 255) for x in (r, g, b)) in KEEP:
            return None
        c = steel(r, g, b)
        return None if c is None else c + (a,)

    def texture(self, r, g, b):
        return steel(r, g, b)


# name, menu label, the plate color, then what gold and the yellow lights become where they would wash out
PALETTES = [
    Blue(),
    Dark("charcoal", "Charcoal", "#51534a", accent="#ffe584", gain=2.3),
    Light("green", "Fern green", "#7c9858", accent="#940731", ink="#0b0d0f"),
    Light("khaki", "Khaki", "#9b945f", accent="#2f5f75", glow="#73c4d4", ink="#0b0d0f"),
    Light("ice", "Ice blue", "#73c4d4", accent="#940731", ink="#2f5f75"),
    Light("bone", "Bone", "#cac7a7", accent="#7c9858", ink="#51534a"),
    Light("gold", "Gold", "#e8c446", accent="#940731", glow="#73c4d4", ink="#940731", glow_l=.92),
    Light("lemon", "Pale yellow", "#ffe584", accent="#2f5f75", glow="#c22033", ink="#2f5f75", glow_l=.9),
]
CRIMSON = {"name": "crimson", "label": "Crimson", "base": "#940731", "tone": "dark", "bar": "#5b0a1f"}
LIGHT = [p.name for p in PALETTES if p.tone == "light"]


def manifest():
    """What the page needs to know about the palettes: names, menu labels, swatch and toolbar colors."""
    rows = [CRIMSON] + [{"name": p.name, "label": p.label, "base": p.base, "tone": p.tone, "bar": p.bar} for p in PALETTES]
    return rows


def _fmt(c, like_hex):
    r, g, b = (min(255, max(0, round(x * 255))) for x in c[:3])
    a = c[3] if len(c) > 3 else None
    if a is None:
        return "#%02x%02x%02x" % (r, g, b) if like_hex else f"rgb({r},{g},{b})"
    return f"rgba({r},{g},{b},{('%g' % a).replace('0.', '.') if a else '0'})"


def _parse(literal):
    if literal.startswith("#"):
        h = literal.lower()
        full = h if len(h) == 7 else "#" + "".join(c * 2 for c in h[1:])
        return _rgb(full) + (None,)
    m = FUNC.fullmatch(literal)
    return tuple(int(m.group(i)) / 255 for i in (1, 2, 3)) + (None if m.group(4) is None else float(m.group(4)),)


def _in(palette, literal, role):
    """literal as the palette shows it in that role, or None when it stays as written."""
    if isinstance(palette, Blue):                     # exactly the original translation
        return _hex(literal) if literal.startswith("#") else _func(FUNC.fullmatch(literal))
    c = palette.color(*_parse(literal), role)
    if c is None:
        return None
    out = _fmt(c, literal.startswith("#"))
    return None if out == literal else out


def _texture_in(palette, url, role):
    if isinstance(palette, Blue):
        return _texture(url)

    def matrix(m):
        vals = re.findall(NUM, m.group(2))
        if len(vals) != 20 or any(float(vals[i]) for i in (0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13)):
            return m.group(0)
        c = palette.texture(*(min(max(float(vals[i]), 0), 1) for i in (4, 9, 14)))
        if c is None:
            return m.group(0)
        num = lambda x: ("%.2f" % x).rstrip("0").rstrip(".").replace("0.", ".") or "0"
        return m.group(1) + "  ".join([f"0 0 0 0 {num(x)}" for x in c] + [" ".join(vals[15:])]) + m.group(3)

    def hexin(m):                                      # colors drawn inside an SVG, such as the Edison bulb
        c = palette.color(*_rgb("#" + (m.group(2) if len(m.group(2)) == 6 else "".join(ch * 2 for ch in m.group(2)))), None,
                          "glow" if role == "glow" else "fill")
        return m.group(0) if c is None else m.group(1) + _fmt(c[:3], True)[1:]

    out = MATRIX.sub(matrix, url)
    out = re.sub(r"(%23|#)((?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-zA-Z])", hexin, out)
    return None if out == url else out


def token(literal, role=None):
    """One token per color; a color used in more than one role gets one token per role."""
    key = literal if role in (None, "fill") else literal + "|" + role
    return "--c-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:7]


PRINT = re.compile(r"@media\s+print\s*\{")


def _print_blocks(css):
    """css split into (text, is_print_block) runs: print rules keep their own colors in every palette but blue."""
    out, i = [], 0
    while True:
        m = PRINT.search(css, i)
        if not m:
            out.append((css[i:], False))
            return out
        depth, k = 1, m.end()
        while depth and k < len(css):
            depth += (css[k] == "{") - (css[k] == "}")
            k += 1
        out.append((css[i:m.start()], False))
        out.append((css[m.start():k], True))
        i = k


def themed(css, found=None):
    """css with each translated literal replaced by var(--c-…), preceded by the crimson defaults and one rule per palette."""
    pairs = {}                            # token -> (crimson literal, {palette name: literal}), in order of first use

    def use(crimson, values, role):
        name = token(crimson, role)
        if pairs.setdefault(name, (crimson, values)) != (crimson, values):
            raise SystemExit(f"palette: two colors share the token {name}")
        if found is not None and "blue" in values:
            found[crimson] = (values["blue"], found.get(crimson, (values["blue"], 0))[1] + 1)
        return f"var({name})"

    def literal(text, role, printing):
        if role == "keep":
            return None
        palettes = PALETTES[:1] if printing else PALETTES
        values = {p.name: v for p in palettes if (v := _in(p, text, role)) is not None}
        return use(text, values, "print" if printing else role) if values else None

    def colors(text, role, printing):
        if role == "skip":
            return text
        text = FUNC.sub(lambda m: literal(re.sub(r"\s+", "", m.group(0)), role, printing) or m.group(0), text)
        return HEX.sub(lambda m: literal(m.group(0).lower(), role, printing) or m.group(0), text)

    def block(text, printing, state):
        """Translate declaration values only, so an id selector such as #fab is never read as a color."""
        def decl(m):
            state["role"] = role_of(m.group(1))
            return m.group(1) + m.group(2) + colors(m.group(3), state["role"], printing)
        if DECL.match(text):
            return DECL.sub(decl, text)
        # the continuation of a value that a comment, string or data: URL interrupted
        head, sep, tail = text.partition(";")
        return colors(head, state["role"], printing) + sep + (DECL.sub(decl, tail) if tail else "")

    out = []
    for chunk, printing in _print_blocks(css):
        state = {"role": "fill"}
        for part in SPLIT.split(chunk):
            if not part:
                continue
            if part.startswith("/*") or part[0] in "\"'":
                out.append(part)
            elif part.startswith('url("data:'):
                role = state["role"]
                values = {p.name: v for p in (PALETTES[:1] if printing else PALETTES) if (v := _texture_in(p, part, role)) is not None}
                out.append(use(part, values, "print" if printing else None) if values else part)
            else:
                # selectors end at "{"; everything from there to "}" is declarations (or a nested rule's selector)
                pieces = re.split(r"([{}])", part)
                for i, piece in enumerate(pieces):
                    if piece in "{}":
                        out.append(piece)
                        if piece == "{":
                            state["role"] = "fill"
                        continue
                    nxt = next((p for p in pieces[i + 1:] if p in ("{", "}")), None)
                    # text followed by "{" is a selector or at-rule prelude, unless it also holds earlier declarations
                    if nxt == "{":
                        head, sep, tail = piece.rpartition(";")
                        out.append((block(head + sep, printing, state) if sep else "") + tail)
                    else:
                        out.append(block(piece, printing, state))
    body = "".join(out)
    if not pairs:
        return css
    rules = [":root{" + ";".join(f"{k}:{v[0]}" for k, v in pairs.items()) + "}"]
    for p in PALETTES:
        rules.append(f'html[data-theme="{p.name}"]{{' + ";".join(f"{k}:{v[1][p.name]}" for k, v in pairs.items() if p.name in v[1]) + "}")
    head = "/* palette tokens, written by tools/palette.py: the crimson literals of this bundle and their twin in each palette */\n"
    return head + "\n".join(rules) + "\n" + body


DECL = re.compile(r"(\s*[-\w]+\s*)(:)([^;{}]*)")


def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    found = {}
    for f in sorted((root / "src" / "css").glob("*.css")):
        themed(f.read_text(encoding="utf-8"), found)
    for crimson, (blue, n) in sorted(found.items(), key=lambda kv: -kv[1][1]):
        print(f"{n:4}  {crimson[:60]:<60} {blue[:60]}")
    print(len(found), "colors translated")


if __name__ == "__main__":
    sys.exit(main())
