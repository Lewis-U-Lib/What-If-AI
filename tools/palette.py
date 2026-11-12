"""The blue-steel palette, derived at build time from the crimson stylesheets.

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

    python3 tools/palette.py            # list every translated color, most used first
"""
import colorsys
import hashlib
import pathlib
import re
import sys

HUE = 199 / 360          # the steel blue of the Library's panel (#2f5f75)
ATTR = 'html[data-theme="blue"]'

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


def token(literal):
    return "--c-" + hashlib.sha1(literal.encode("utf-8")).hexdigest()[:7]


def themed(css, found=None):
    """css with each translated literal replaced by var(--c-…), preceded by the two sets of definitions."""
    pairs = {}                            # token -> (crimson literal, blue literal), in order of first use

    def use(crimson, blue):
        name = token(crimson)
        if pairs.setdefault(name, (crimson, blue)) != (crimson, blue):
            raise SystemExit(f"palette: two colors share the token {name}")
        if found is not None:
            found[crimson] = (blue, found.get(crimson, (blue, 0))[1] + 1)
        return f"var({name})"

    def colors(text):
        text = FUNC.sub(lambda m: use(re.sub(r"\s+", "", m.group(0)), b) if (b := _func(m)) else m.group(0), text)
        return HEX.sub(lambda m: use(m.group(0).lower(), b) if (b := _hex(m.group(0))) else m.group(0), text)

    def block(text):
        """Translate declaration values only, so an id selector such as #fab is never read as a color."""
        return re.sub(r"(:)([^;{}]*)", lambda m: m.group(1) + colors(m.group(2)), text)

    out, depth_text = [], []
    for part in SPLIT.split(css):
        if not part:
            continue
        if part.startswith("/*") or part[0] in "\"'":
            out.append(part)
        elif part.startswith('url("data:'):
            blue = _texture(part)
            out.append(use(part, blue) if blue else part)
        else:
            # selectors end at "{"; everything from there to "}" is declarations (or a nested rule's selector)
            pieces = re.split(r"([{}])", part)
            for i, piece in enumerate(pieces):
                if piece in "{}":
                    out.append(piece)
                    continue
                nxt = next((p for p in pieces[i + 1:] if p in ("{", "}")), None)
                # text followed by "{" is a selector or at-rule prelude, unless it also holds earlier declarations
                if nxt == "{":
                    head, sep, tail = piece.rpartition(";")
                    out.append(block(head) + sep + tail)
                else:
                    out.append(block(piece))
    body = "".join(out)
    if not pairs:
        return css
    crimson = ";".join(f"{k}:{v[0]}" for k, v in pairs.items())
    blue = ";".join(f"{k}:{v[1]}" for k, v in pairs.items())
    head = ("/* palette tokens, written by tools/palette.py: the crimson literals of this bundle and their steel-blue twins */\n"
            f":root{{{crimson}}}\n{ATTR}{{{blue}}}\n")
    return head + body


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
