# Finder matching contract

The Finder reads the same released activities as The Register. `src/js/matching.js`
contains pure matching rules used by the browser and the regression tests. It never
edits activity records. The existing task/field/scale/level/setting weights remain
8/4/3/2/1, with partial credit of 1 for an unspecified field or level. Those weights
prioritize recorded attributes; they do not estimate educational effectiveness.

## Preferences

A preference is unasked, exact, compatible, or mismatched. `any` level/setting and a
blank primary field are compatible, not exact. The UI names unspecified attributes
and asks the reader to check suitability. A specific different value is a mismatch.
The same comparison governs scoring, grouping, and offered options. Work focus is
still a gate. Current admission behavior still excludes `active` and `passive`.

Confirmed candidates appear in separate exact, compatible, and one-mismatch groups.
Each group can show more results. Every card with a mismatch names it; every card with
unspecified matching attributes says what to check. When none of those groups has a
candidate, a recovery message offers explicit preference changes and displays broader
starting points with all mismatches named. Recovery never silently removes a limit.
Counts and the navigation rail describe these groups, not the entire focus pool.

Field arrays/secondary field tags, educational effectiveness, and validation of no-AI
route descriptions remain separate corpus work. This change does not infer new field
assignments or manufacture missing source evidence.

## Selected requirements

Each selected limit evaluates to confirmed, unknown, or excluded. Any known conflict
excludes the activity from both the confirmed and the unknown groups. Otherwise, any
unknown requirement places it only in the separate, initially collapsed “Check
requirements before considering” group. Its card names each requirement to check.

| Limit | Confirmed under the current release | Excluded | Unknown |
|---|---|---|---|
| No AI | `none_required` capability or existing nonempty `na` route | Neither is recorded | — |
| No student-authored input | `none`, `student_derived_deidentified`, `research_participant_deidentified` sensitivity | Other recorded sensitivity categories | Missing or `not_specified` sensitivity |
| No payment | `no_tool_needed`, `free_tier`, `institution_provided` | `paid_with_stated_alternative` under the existing route contract | Missing, unspecified, or unrecognized cost |
| No account | `pc: none` | `account_verification` | Every other prerequisite category |
| No equipment/travel/purchases | `pc: none` | `equipment_required`, `travel_or_attendance`, `purchased_material` | Every other prerequisite category |
| No formal disclosure | `none_required`, `informal_acknowledgement`, `documented_log`, `anonymity_by_design` | `formal_statement` | Missing, unspecified, or unrecognized disclosure |
| No approval | `pc: none` | `institutional_approval_required` | Every other prerequisite category |

`pc` is a single legacy prerequisite category. For example, `human_checking_required`
does not establish whether an account, equipment, or approval is also necessary. Treat
these as unknown instead of interpreting one recorded requirement as proof that all
other requirements are absent. An explicit `none` is accepted as the release's statement
that no such prerequisite is recorded; this is not an independent source revalidation.

The corpus pipeline can eventually export independent yes/no/unknown requirements
with evidence and variant-specific values. Until then, this conservative interpretation
is used without changing the signed release or claiming missing facts. No-AI alternatives
still use the original record's other metadata; route-level metadata is not inferred.

Changing a limit preserves preferences. Changing work focus can still clear an
inapplicable task, with an announcement. Unknown candidates support question options
because they remain inspectable; they never count as confirmed results.

## Verification

`tests/matching.test.js` checks independently specified fixture outcomes, live-audit
regressions, all 128 limit combinations and 448 single-limit additions, separation of
known conflicts and unknowns, preservation of input data, and the audit's original
16,452 preference combinations. That grid includes unanswered values, omits scale
where the original wizard skipped its sole option, and applies no hard limits. It is
a regression grid, not a measurement of visitor behavior or faculty relevance.

`tests/matching-browser.test.js` covers complete wizard navigation, compatibility notes,
the broader recovery path, Back navigation, preservation of limits/preferences,
unknown-group disclosure and pagination, focus restoration, all-unknown/all-excluded
fixtures, and four viewport widths. Accessibility and contrast checks include the new
compatibility and requirement states. The deployment runs these tests automatically.
