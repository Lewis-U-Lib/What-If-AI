# Moving the site to its own repository

Quidsima and The Register were published from `Lewis-U-Lib/What-If-AI` at `https://lewis-u-lib.github.io/What-If-AI/`. This branch is the whole site set up for a repository named `Quidsima`, published at `https://lewis-u-lib.github.io/Quidsima/`.

## What changes with the address

| | Before | After |
|---|---|---|
| Site | `lewis-u-lib.github.io/What-If-AI/` | `lewis-u-lib.github.io/Quidsima/` |
| Tool page | `what-if-ai.html` | `quidsima.html` |
| The Register | `register.html` | `register.html` |
| Landing page | `index.html` | `index.html` |

The address is set in one place, `base_url` in `site.json`. Canonical links, the sitemap, `robots.txt`, the 404 page, and the local preview server all read it.

## What does not change

- **Saved lists and settings.** Both addresses are on `lewis-u-lib.github.io`, and a browser keeps storage per host, not per folder. Saved use-case ideas, trial plans, the palette, and the plain reading view carry over without anyone doing anything. The storage keys (`lul-whatifai-…`) and the saved-list file format (`what-if-ai-saved-list`) are deliberately unchanged, and a list downloaded from the old address restores here.
- **Analytics.** The site reports to the same Umami website with the same tag, so the record is continuous. Page addresses in reports change from `/What-If-AI/…` to `/Quidsima/…` on the day of the move.
- **The feedback form** is still `lewisu.libwizard.com/f/What-If-AI`. If the form is renamed in LibWizard, update the four links (`src/partials/footer.html`, `src/partials/tour.html`, `src/partials/register-tour.html`, and the headers of `src/pages/index.html` and `src/pages/404.html`) and the check in `tests/answers.test.js`.
- **Internal file names** `src/css/what-if-ai.css` and `src/js/what-if-ai.js`. Readers never see them: the build fingerprints and bundles them.
- **`data/release.json`** still names `Lewis-U-Lib/What-If-AI` and a commit there as the source of the data release, because that is where it was built.

## Setting up the new repository

1. Create an empty repository `Lewis-U-Lib/Quidsima` (no README, license, or .gitignore).
2. Push this branch to it as `main`:
   ```
   git clone https://github.com/Lewis-U-Lib/What-If-AI.git && cd What-If-AI
   git push https://github.com/Lewis-U-Lib/Quidsima.git origin/quidsima-site:refs/heads/main
   ```
   This carries the full history.
3. In the new repository: **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` builds, runs every test suite, and publishes; it needs no other setting.
4. When the first run finishes, open `https://lewis-u-lib.github.io/Quidsima/` and check the three pages.

## Leaving redirects at the old address

Only after step 4: merge the `redirect-to-quidsima` pull request (#59) in `Lewis-U-Lib/What-If-AI`. It replaces the old site with small pages that send each old address to its new one, keeping whatever follows `#` or `?`, so shared results links and links to a single use-case idea still open the same thing:

- `…/What-If-AI/` → `…/Quidsima/`
- `…/What-If-AI/what-if-ai.html#a=…` → `…/Quidsima/quidsima.html#a=…`
- `…/What-If-AI/register.html#act=…` → `…/Quidsima/register.html#act=…`
- anything else under `/What-If-AI/` → the new landing page

## After the move

- Replace the LibGuides widget with the Quidsima version and point its links at the new address.
- Update links on the Library's guides and anywhere else the old address was shared; the redirects cover the rest.
- The old repository can be archived once the redirect is in place. Archiving does not take its Pages site down.
