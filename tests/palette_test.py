"""The steel-blue palette is the crimson one with the hue swapped: same luminance, nothing else touched."""
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
            self.assertIn(kept, palette.themed('a{color:%s}' % kept))
            self.assertNotIn('var(', palette.themed('a{color:%s}' % kept))

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
        body = out.split('\n', 3)[3]
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
        restored = re.sub(r'var\((--c-[0-9a-f]{7})\)', lambda m: defaults[m.group(1)], out.split('\n', 3)[3])
        norm = lambda s: re.sub(r'rgba?\([^)]*\)', lambda m: re.sub(r'\s+', '', m.group(0)), s)
        lower = lambda s: re.sub(r'#[0-9a-fA-F]{3,6}\b', lambda m: m.group(0).lower(), s)
        self.assertEqual(lower(norm(restored)), lower(norm(css)))     # substituting the defaults gives back the source

    def test_a_stylesheet_without_crimson_is_returned_unchanged(self):
        css = '.a{color:#debb70;background:rgba(0,0,0,.4)}'
        self.assertEqual(palette.themed(css), css)


if __name__ == '__main__':
    unittest.main()
