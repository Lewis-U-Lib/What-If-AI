"""The steel-blue palette is the crimson one with the hue swapped: same luminance, nothing else touched.
The light palette turns luminance over: pale plates, dark ink, crimson where gold was, shadows still shadows."""
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


def contrast(a, b):
    hi, lo = sorted((palette.luminance(*a), palette.luminance(*b)), reverse=True)
    return (hi + .05) / (lo + .05)


class PaletteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.found, cls.light = {}, {}
        for f in sorted((ROOT / 'src' / 'css').glob('*.css')):
            palette.themed(f.read_text(encoding='utf-8'), cls.found, cls.light)
        cls.colors = {c: b for c, (b, _) in cls.found.items() if not c.startswith('url(')}

    def test_every_crimson_token_in_the_house_palette_is_translated(self):
        for crimson in ('#520e20', '#781230', '#8a1638', '#e8ced3'):
            self.assertIn(crimson, self.colors)

    def test_gold_neutrals_and_meaningful_reds_stay(self):
        for kept in ('#debb70', '#ffc72c', '#f2a900', '#ffffff', '#000000', '#ff9d9d', '#ffb3a1', '#ff8f8f', '#c7485f'):
            self.assertNotIn(kept, self.colors)
            out = palette.themed('a{color:%s}' % kept)
            self.assertIn(':root{--c-%s:%s}' % (palette.token(kept)[4:], kept), out)      # the default is the literal
            self.assertIn('\nhtml[data-theme="blue"]{}\n', out)                           # and steel blue does not change it

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
        body = out.split('\n', 5)[5]
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
        restored = re.sub(r'var\((--c-[0-9a-f]{7})\)', lambda m: defaults[m.group(1)], out.split('\n', 5)[5])
        norm = lambda s: re.sub(r'rgba?\([^)]*\)', lambda m: re.sub(r'\s+', '', m.group(0)), s)
        lower = lambda s: re.sub(r'#[0-9a-fA-F]{3,6}\b', lambda m: m.group(0).lower(), s)
        self.assertEqual(lower(norm(restored)), lower(norm(css)))     # substituting the defaults gives back the source

    def test_a_stylesheet_without_colors_is_returned_unchanged_and_one_without_crimson_has_no_blue(self):
        css = '.a{display:flex;white-space:nowrap}#fab{margin:0}'
        self.assertEqual(palette.themed(css), css)
        self.assertIn('\nhtml[data-theme="blue"]{}\n', palette.themed('.a{color:#debb70;background:rgba(0,0,0,.4)}'))

    # ---- the light palette

    def test_turning_luminance_over_keeps_every_contrast_ratio(self):
        samples = [0, .003, .01, .03, .07, .18, .4, .7, 1]
        for a in samples:
            for b in samples:
                before = (max(a, b) + .05) / (min(a, b) + .05)
                ta, tb = palette.turned(a), palette.turned(b)
                self.assertAlmostEqual((max(ta, tb) + .05) / (min(ta, tb) + .05), before, places=9)
        self.assertAlmostEqual(palette.turned(0), 1)
        self.assertAlmostEqual(palette.turned(1), 0)

    def test_light_plates_are_pale_and_lettering_is_ink_or_crimson(self):
        hexes = {c: l for c, (l, _) in self.light.items() if re.fullmatch(r'#[0-9a-f]{6}', c) and re.fullmatch(r'#[0-9a-f]{6}', l)}
        for ground in ('#520e20', '#3b0913', '#4f0e1b', '#6c1221', '#2a0610'):
            r, g, b = rgb(hexes[ground])
            self.assertGreater(palette.luminance(r, g, b), .7, f'{ground} -> {hexes[ground]}')
            self.assertLess(max(r, g, b) - min(r, g, b), .08, f'{ground} -> {hexes[ground]} is close to neutral')
        for gold in ('#debb70', '#ffc72c', '#f2a900'):
            r, g, b = rgb(hexes[gold])
            self.assertTrue(r > .35 and g < .12 and b < .3, f'{gold} -> {hexes[gold]} is Lewis crimson')
        self.assertEqual(hexes['#ffffff'], '#000000')

    def test_light_keeps_lettering_readable_on_every_plate(self):
        """A pale-on-dark pair in the source is dark-on-pale in light, at no less than its source contrast or 7:1."""
        hexes = {c: l for c, (l, _) in self.light.items() if re.fullmatch(r'#[0-9a-f]{6}', c) and re.fullmatch(r'#[0-9a-f]{6}', l)}
        grounds = [c for c in hexes if palette.family(*rgb(c)) == 'crimson' and palette.luminance(*rgb(c)) < .06 and c not in palette.KEEP]
        inks = [c for c in hexes if palette.family(*rgb(c)) in ('gold', 'neutral') and palette.luminance(*rgb(c)) > .3]
        self.assertGreater(len(grounds), 20)
        self.assertGreater(len(inks), 10)
        for ground in grounds:
            for ink in inks:
                before, after = contrast(rgb(ground), rgb(ink)), contrast(rgb(hexes[ground]), rgb(hexes[ink]))
                self.assertGreaterEqual(after, min(before, 7) - .1, f'{ink} on {ground}: {before:.2f} -> {after:.2f} ({hexes[ink]} on {hexes[ground]})')

    def test_reds_that_carry_meaning_stay_red_in_light(self):
        for red in palette.KEEP:
            if red in self.light:
                r, g, b = rgb(self.light[red][0])
                self.assertTrue(r > g and r > b, f'{red} -> {self.light[red][0]}')

    def test_shadows_stay_shadows_in_light(self):
        out = palette.themed('.a{background:rgba(0,0,0,.5);box-shadow:0 2px 8px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.2)}')
        light = dict(re.findall(r'(--c-[0-9a-f]{7}):([^;}]+)', out.split('\n')[3]))
        self.assertEqual(len(light), 2)                          # the white highlight is left as it is
        self.assertIn('rgba(255,255,255,.5)', light.values())    # a dark wash over a plate becomes a pale one
        shade = [v for v in light.values() if v != 'rgba(255,255,255,.5)'][0]
        r, g, b = rgb(shade)
        self.assertLess(palette.luminance(r, g, b), .05)         # the cast shadow is still dark,
        self.assertLess(float(re.search(r',([\d.]+)\)$', shade).group(1)), .25)   # and lighter than it was

    def test_print_forced_colors_and_light_only_rules_are_left_alone_in_light(self):
        for css in ('@media print{.a{color:#111;background:#fff}}', '@media(forced-colors:active){.a{color:#ffffff}}',
                    'html[data-theme="light"] .a{color:#940731;background:#ffffff}',
                    '@supports (mask-image:linear-gradient(#000,#000)){html[data-theme="light"] .a::before{background:#940731}}'):
            out = palette.themed(css)
            if out != css:                                       # a crimson still has its steel-blue twin
                self.assertIn('\nhtml[data-theme="light"]{}\n', out)

    def test_islands_keep_the_crimson_palette_and_redeclare_the_root_properties(self):
        out = palette.themed(':root{--gold:#debb70;--ground:#520e20}.fab-toggle{background:var(--gold)}')
        island = out.split('\n')[4]
        self.assertTrue(island.startswith('html[data-theme="light"] :is(.fab-toggle'))
        tokens = dict(re.findall(r'(--c-[0-9a-f]{7}):([^;}]+)', island))
        self.assertEqual(sorted(tokens.values()), ['#520e20', '#debb70'])
        self.assertRegex(island, r'--gold:var\(--c-[0-9a-f]{7}\);--ground:var\(--c-[0-9a-f]{7}\)\}$')

    def test_light_output_is_stable_and_blue_is_exactly_what_it_was(self):
        """The light pass may read more of each value than the steel-blue pass does, but must not add to steel blue."""
        css = '.a{background:url("data:image/png;base64,AAAA"),linear-gradient(#520e20,#debb70)}'
        out = palette.themed(css)
        self.assertEqual(out, palette.themed(css))
        self.assertIn('\nhtml[data-theme="blue"]{}\n', out)     # the gradient after the data: URL was never translated for blue
        self.assertEqual(len(re.findall(r'--c-[0-9a-f]{7}:', out.split('\n')[3])), 2)


if __name__ == '__main__':
    unittest.main()
