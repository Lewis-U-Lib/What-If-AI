"""The palette family: steel blue is crimson with the hue swapped at equal luminance; the others are built around a named color."""
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import palette


def rgb(literal):
    if literal.startswith('#'):
        return tuple(int(literal[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return tuple(int(v) / 255 for v in re.findall(r'\d+', literal)[:3])


def body_of(out):
    """The stylesheet after its token rules."""
    return out.split('\n', 2 + len(palette.PALETTES))[-1]


def blue_rule(out):
    return next((line for line in out.split('\n') if line.startswith('html[data-theme="blue"]')), '')


def contrast(a, b):
    hi, lo = sorted((palette.luminance(*a), palette.luminance(*b)), reverse=True)
    return (hi + .05) / (lo + .05)


class PaletteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.found = {}
        for f in sorted((ROOT / 'src' / 'css').glob('*.css')):
            palette.themed(f.read_text(encoding='utf-8'), cls.found)
        cls.colors = {c: b for c, (b, _) in cls.found.items() if not c.startswith('url(')}

    def test_every_crimson_token_in_the_house_palette_is_translated(self):
        for crimson in ('#520e20', '#781230', '#8a1638', '#e8ced3'):
            self.assertIn(crimson, self.colors)

    def test_gold_neutrals_and_meaningful_reds_stay(self):
        for kept in ('#debb70', '#ffc72c', '#f2a900', '#ffffff', '#000000', '#ff9d9d', '#ffb3a1', '#ff8f8f', '#c7485f'):
            self.assertNotIn(kept, self.colors)
            self.assertNotIn(kept, blue_rule(palette.themed('a{background:%s}' % kept)))

    def test_blue_keeps_each_colors_contrast_against_white_gold_and_black(self):
        """Luminance is matched, so a ratio that passes on crimson passes on steel (within 8-bit rounding)."""
        references = {'white': (1, 1, 1), 'gold': rgb('#debb70'), 'black': (0, 0, 0)}
        for crimson, blue in self.colors.items():
            for name, ref in references.items():
                before, after = contrast(rgb(crimson), ref), contrast(rgb(blue), ref)
                self.assertLess(abs(before - after) / before, .06, f'{crimson} -> {blue} against {name}: {before:.2f} vs {after:.2f}')
                if before >= 4.5:
                    self.assertGreaterEqual(after, 4.5 - .05, f'{crimson} -> {blue} against {name}')

    def test_blue_is_blue_and_alpha_is_untouched(self):
        for crimson, blue in self.colors.items():
            r, g, b = rgb(blue)
            self.assertTrue(b >= g >= r, f'{crimson} -> {blue}')
            self.assertEqual(re.findall(r',([\d.]+)\)$', crimson), re.findall(r',([\d.]+)\)$', blue))

    def test_textures_keep_their_grain_and_change_only_their_color(self):
        urls = [c for c in self.found if c.startswith('url(')]
        self.assertEqual(len(urls), 4)
        for crimson in urls:
            blue = self.found[crimson][0]
            strip = lambda s: re.sub(r"values='[^']*'", lambda m: 'values=' + ' '.join(m.group(0)[8:-1].split()[15:]), s)
            self.assertEqual(strip(crimson), strip(blue))          # same noise, same alpha row
            self.assertNotEqual(crimson, blue)

    def test_only_declaration_values_are_rewritten(self):
        css = '#fab,#bad .x{color:#520e20}/* #520e20 */.y::after{content:"#520e20";background:url("data:image/png;base64,AAAA")}'
        out = palette.themed(css)
        body = body_of(out)
        self.assertTrue(body.startswith('#fab,#bad .x{color:var(--c-'))
        self.assertIn('/* #520e20 */', body)
        self.assertIn('content:"#520e20"', body)
        self.assertEqual(body.count('var(--c-'), 1)

    def test_default_values_are_the_source_literals_and_the_output_is_stable(self):
        css = (ROOT / 'src' / 'css' / 'theme-plate.css').read_text(encoding='utf-8')
        out = palette.themed(css)
        self.assertEqual(out, palette.themed(css))
        root_line, blue_line = out.split('\n')[1:3]
        self.assertTrue(root_line.startswith(':root{') and blue_line.startswith('html[data-theme="blue"]{'))
        defaults = dict(re.findall(r'(--c-[0-9a-f]{7}):((?:url\("[^"]*"\)|[^;}])+)', root_line))
        self.assertEqual(set(defaults), set(re.findall(r'var\((--c-[0-9a-f]{7})\)', out)))
        restored = re.sub(r'var\((--c-[0-9a-f]{7})\)', lambda m: defaults[m.group(1)], body_of(out))
        norm = lambda s: re.sub(r'rgba?\([^)]*\)', lambda m: re.sub(r'\s+', '', m.group(0)), s)
        lower = lambda s: re.sub(r'#[0-9a-fA-F]{3,6}\b', lambda m: m.group(0).lower(), s)
        self.assertEqual(lower(norm(restored)), lower(norm(css)))     # substituting the defaults gives back the source

    def test_a_stylesheet_with_nothing_to_translate_is_returned_unchanged(self):
        css = '.a{mask-image:linear-gradient(#000,#520e20);--swatch:#940731;--paper:#fbf3e4;margin:0}'
        self.assertEqual(palette.themed(css), css)


class FamilyTests(unittest.TestCase):
    """The seven palettes built around a named color."""

    @classmethod
    def setUpClass(cls):
        cls.css = '\n'.join(f.read_text(encoding='utf-8') for f in sorted((ROOT / 'src' / 'css').glob('*.css')))
        cls.out = palette.themed(cls.css)
        cls.light = [p for p in palette.PALETTES if p.tone == 'light']

    def value(self, name, literal, prop):
        """What a one-declaration stylesheet's color becomes in the named palette (the literal itself when it stays)."""
        out = palette.themed('a{%s:%s}' % (prop, literal))
        m = re.search(r'html\[data-theme="%s"\]\{--c-[0-9a-f]{7}:([^;}]+)' % name, out)
        return m.group(1) if m else literal

    def test_the_family_is_the_panel_minus_crimson_and_each_palette_has_its_rule(self):
        self.assertEqual([p.name for p in palette.PALETTES], ['blue', 'charcoal', 'green', 'khaki', 'ice', 'bone', 'gold', 'lemon'])
        self.assertEqual([p.base for p in palette.PALETTES], ['#2f5f75', '#51534a', '#7c9858', '#9b945f', '#73c4d4', '#cac7a7', '#e8c446', '#ffe584'])
        for p in palette.PALETTES:
            self.assertEqual(self.out.count('\nhtml[data-theme="%s"]{' % p.name), 1)

    def test_the_theme_script_lists_the_same_palettes(self):
        js = (ROOT / 'src' / 'js' / 'theme.js').read_text(encoding='utf-8')
        listed = re.findall(r"^\s+(\w+):\s+\['([^']+)', '(#[0-9a-f]{6})', '(light|dark)'\]", js, re.M)
        self.assertEqual(listed, [(m['name'], m['label'], m['bar'], m['tone']) for m in palette.manifest()])
        html = (ROOT / 'src' / 'partials' / 'help.html').read_text(encoding='utf-8')
        self.assertEqual(re.findall(r'data-theme-choice="(\w+)"[^>]*aria-label="([^"]+) palette"', html), [(m['name'], m['label']) for m in palette.manifest()])
        plate = (ROOT / 'src' / 'css' / 'theme-plate.css').read_text(encoding='utf-8')
        self.assertEqual(re.findall(r'\.swatch\[data-theme-choice="(\w+)"\]\{--swatch:(#[0-9a-f]{6});\}', plate), [(m['name'], m['base']) for m in palette.manifest()])

    def test_a_light_palettes_plate_is_its_named_color(self):
        for p in self.light:
            got = rgb(self.value(p.name, '#6c1221', 'background'))
            self.assertTrue(all(abs(a - b) <= 1.5 / 255 for a, b in zip(got, rgb(p.base))), f'{p.name}: {got}')

    def test_light_palettes_turn_the_page_over(self):
        """Dark surfaces become light, light text becomes dark, and each still reads on the other."""
        surfaces = ['#22040b', '#3b0913', '#4f0e1b', '#56101f', '#6c1221', '#781230', '#8a1638', '#b41441']
        inks = ['#ffffff', '#f0dde1', '#e8ced3', '#debb70', '#fff6dd', '#ffe8a0', '#8fd6a0', '#ff9d9d']
        for p in self.light:
            grounds = [rgb(self.value(p.name, s, 'background')) for s in surfaces]
            for ink in inks:
                text = rgb(self.value(p.name, ink, 'color'))
                for s, ground in zip(surfaces, grounds):
                    self.assertGreaterEqual(contrast(text, ground), 4.5, f'{p.name}: {ink} on {s}')
            lums = [palette.luminance(*g) for g in grounds[:5]]
            self.assertEqual(lums, sorted(lums, reverse=True), f'{p.name}: the darker the crimson, the lighter the tint')

    def test_what_sat_on_brass_reads_on_the_accent(self):
        for p in self.light:
            on = rgb(self.value(p.name, '#2a0610', 'color'))
            for brass in ('#f3dc9e', '#debb70', '#b8914a'):
                self.assertGreaterEqual(contrast(on, rgb(self.value(p.name, brass, 'background'))), 4.5, f'{p.name}: on {brass}')

    def test_charcoal_stays_dark_and_keeps_light_text(self):
        plate = rgb(self.value('charcoal', '#6c1221', 'background'))
        self.assertLess(max(plate) - min(plate), .08)
        self.assertEqual(self.value('charcoal', '#ffffff', 'color'), '#ffffff')
        for ink in ('#ffffff', '#f0dde1', '#debb70'):
            self.assertGreaterEqual(contrast(rgb(self.value('charcoal', ink, 'color')), plate), 4.5, ink)

    def test_print_rules_masks_and_swatches_keep_their_colors(self):
        out = palette.themed('@media print{a{color:#111;background:#fff;border:1px solid #debb70}}')
        self.assertNotIn('var(', out)
        out = palette.themed('@media print{a{color:#520e20}}b{color:#fff}')
        self.assertEqual(len(set(re.findall(r'--c-[0-9a-f]{7}', out))), 2)
        printed = re.search(r'@media print\{a\{color:var\((--c-[0-9a-f]{7})\)', out).group(1)
        self.assertEqual(re.findall(r'html\[data-theme="(\w+)"\]\{[^}]*%s' % printed, out), ['blue'])
        self.assertEqual(self.value('gold', '#000', 'mask-image'), '#000')
        self.assertEqual(self.value('gold', '#940731', '--swatch'), '#940731')

    def test_one_color_can_differ_by_use(self):
        self.assertNotEqual(self.value('gold', '#ffffff', 'color'), self.value('gold', '#ffffff', 'background'))
        self.assertEqual(self.value('gold', '#ffffff', 'background'), '#ffffff')


if __name__ == '__main__':
    unittest.main()
