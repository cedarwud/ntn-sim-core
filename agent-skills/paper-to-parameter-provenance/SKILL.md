---
name: paper-to-parameter-provenance
description: Use when mapping literature or standards evidence into ntn-sim-core parameter registry, parameter spec, or provenance surfaces without letting synthesized simulator docs override the paper-catalog source chain.
---

# Paper To Parameter Provenance

Use this skill when a task needs to convert paper/standard evidence into simulator-usable parameter metadata, defaults, ranges, or source registrations.

## Required Read Order

Read these first:
1. `/home/u24/papers/AGENTS.md`
2. `/home/u24/papers/paper-catalog/README.md`
3. `/home/u24/papers/system-model-refs/README.md`
4. `/home/u24/papers/system-model-refs/simulator-parameter-spec.md`
5. `/home/u24/papers/system-model-refs/simulator-parameter-provenance-inventory.md`
6. the relevant `paper-catalog/catalog/*.json` records
7. when needed, the upstream source chain in this order:
   - `paper-catalog/ref/` PDF
   - regenerated `pdftotext` / `pdftotext -layout`
   - `txt_all/` / `txt_layout_all/`

If the task also affects active simulator implementation, then additionally read:
8. `ntn-sim-core/agent-governance.md`
9. the active phase SDD

## Workflow

1. Identify the parameter or parameter family being traced.
2. Resolve the best evidence from the paper-catalog source chain.
3. Classify the result as one of:
   - standard-backed
   - paper-backed
   - synthesized-range
   - assumption-candidate
4. Record:
   - value or range/preset
   - source type
   - exact locator
   - whether the quantity is adjustable, derived, or internal-only
5. Then update the correct downstream surface:
   - `paper-catalog/catalog/*.json` first if the source record is incomplete
   - `system-model-refs/` spec/provenance docs next
   - simulator source registry/runtime only after the docs are aligned

## Source-Of-Truth Rule

Never let:
1. a stale summary override a per-paper record
2. a per-paper record override the source PDF
3. a synthesized `system-model-refs` statement override the paper-catalog chain

## Do Not

1. Do not infer missing values just because the simulator needs a number.
2. Do not silently upgrade an assumption into paper-backed provenance.
3. Do not collapse synthesized ranges into a fake single-value citation.
4. Do not update runtime provenance without updating the corresponding docs in the same change set.

## Output

Report:
1. which parameter(s) were traced
2. which paper/standard sources support them
3. whether the outcome is paper-backed, standard-backed, synthesized, or assumption-only
4. which repo surfaces were updated
5. any unresolved provenance gaps
