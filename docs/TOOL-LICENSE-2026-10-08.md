# Tool license and included-material rights

Effective October 8, 2026. Reviewed against the published version at
`0c29104c26b34d0abaeb6c5d6cf9e540fb6e4229`.

What If AI and The Register now offer their original tool code, interface text,
artwork, and collection arrangement under **CC BY-NC-ND 4.0**. The prior notice
left the code's license undecided; `LICENSE.md` now states the grant and exceptions.
This does not relicense the use-case ideas or other separately licensed information.

## Component scope

| Component | Current treatment | Verification |
|---|---|---|
| Original tool code, interface, and artwork | CC BY-NC-ND 4.0, to the extent the Library holds the relevant rights | Root license, package metadata, README, NOTICE, shared build configuration |
| Original selection and arrangement | CC BY-NC-ND 4.0 | Explicit scope in footer, page metadata, and print credit |
| All 1,033 use-case ideas, including synthesis and remix | Their existing 18 license/rights descriptions | Every record's license, version, URL, source statement, attribution, citations, relationships, and source-access value compared |
| All 618 source records | Existing terms, including non-CC and unstated/open-access distinctions | Entire source records and source displays compared |
| All 21 policy quotations | Existing wording, contributors, and individual licenses | Every quoted record and every displayed policy position compared |
| Existing Library-authored guide descriptions, product notes, and catalog information | Remain CC BY-NC-SA 4.0 unless an item states different terms | Register and guide data byte-identical; product-note file fingerprint preserved; explicit section/dialog/footer notices |
| Fonts | SIL OFL 1.1 | Every font and OFL notice fingerprint preserved |
| Library logo and Creative Commons badge | Excluded from tool grant; applicable owner/trademark terms | Logo fingerprint preserved; unmodified official CC badge and source recorded |
| Development dependencies | Their existing licenses | Dependency entries preserved; package root points to scoped LICENSE.md |
| Public-domain material, non-CC permissions, linked services | Existing rights/status | No blanket CC conversion |
| Earlier CC BY-NC-SA releases | Earlier permissions remain in effect | Public history notice and root licensing documents |

## Every public notice surface

The canonical tool-license name, 4.0 deed URL, legal-code URL, scope, exceptions,
guide-content notice, and earlier-release notice live in `content/tool-license.json`.
The build uses that definition for all four pages and both interactive tools.

- Shared footer on the landing page, What If AI, The Register, and 404 page: official
  BY-NC-ND badge, accessible name, deed links, scoped grant, retained-content terms,
  suggested credit, and an expandable explanation of earlier releases and exceptions.
- Each page's `rel="license"` link and `dcterms.rights` metadata identify the tool
  license and its content exceptions. The runtime manifest and `version.json`
  identify the same license.
- Both walkthroughs explain the distinction between the tool and its entries.
- Every detail view labels the license for that particular use-case idea and explains
  that the tool license adds no restrictions to it. Source-access warnings refer to
  the entry's own license instead of inheriting a collection-wide license.
- Saved-selection printing uses the same entry renderer. Its credit names the tool
  license with its URL and explicitly retains every entry's terms and attribution.
- The Register's AI-type section and dialogs explain the retained guide-content
  license. Policy and source sections preserve and explain each contribution's terms.
- Copying an entry link continues to copy its stable address; it does not assign a license.

## The 244 note clarifications

A final build stage changes only `licn` on 244 entries. Previously these notes
said that an entry carried “the collection’s CC BY-NC-SA 4.0 license.” They now
identify CC BY-NC-SA 4.0 as the entry's **own retained license**. The actual license,
version, URL, and conditions do not change.

The manifest records four exact before/after wordings, expected occurrence counts
(108, 20, 112, and 4), every affected identifier, and the input/output hashes.
The build refuses changed inputs, unexpected licenses, counts, identifiers, or output.
All other entry fields are identical. `register.json` and `guide.json` are byte-identical.
Imported files and historical review manifests keep their original hashes and wording.

## Reproducible verification

```
python3 tools/check_release.py
python3 -m unittest discover -s tests -p '*_test.py'
python3 tools/build.py
node tests/licensing-browser.test.js
python3 tools/audit_license_scope.py --output /tmp/licensing-verification.json
npm test
```

The licensing browser test verifies 4,132 rendered entry views: all 1,033 entries
in screen and print modes in each tool. It checks each license, source license
statement, deed URL, attribution, note, and scope notice. Each tool also produces a
saved-selection printout containing one example of every one of the 18 existing
license/rights descriptions. The test checks all 618 source notices, all 21 policy
quotations and licenses, guide notices, and all four expanded footers at 320 and
1,280 pixels, including accessibility checks. Existing page, walkthrough, history,
feedback, matching, accessibility, and contrast suites also run before deployment.

`tools/audit_license_scope.py` writes a record-by-record report from the actual built
files. It includes each entry's license and URL, before/after fingerprints of all
protected fields, each clarified note, entire-source fingerprints, policy-quotation
fingerprints, and the unchanged font/logo/product-note fingerprints.

## Basis for the scope

The [CC BY-NC-ND 4.0 deed](https://creativecommons.org/licenses/by-nc-nd/4.0/)
and [legal code](https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.en)
provide the terms for covered tool material. ND limits distribution of adapted
covered material; it does not replace an independent entry's license or restrict
material outside the grant.

Creative Commons explains that a [collection's license does not change the licenses
of included works](https://creativecommons.org/faq/#if-i-create-a-collection-that-includes-a-work-offered-under-a-cc-license-which-licenses-may-i-choose-for-the-collection).
Its guidance also explains that [existing CC grants are irrevocable](https://creativecommons.org/faq/#what-happens-if-the-author-decides-to-revoke-the-cc-license-to-material-i-am-using).
The earlier grants are therefore expressly preserved. This does not make existing
SA-licensed material exclusively ND simply by changing a current notice.

The CC license for original code is the owner's requested choice; Creative Commons
[generally recommends software-specific licenses](https://creativecommons.org/faq/#can-i-apply-a-creative-commons-license-to-software).
Third-party software licenses are preserved separately. No patent or trademark grant
is inferred from the CC license.
