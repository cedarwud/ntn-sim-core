# NTN Sim Core — Assumption Policy

**Version:** 0.1.0  
**Date:** 2026-03-20  
**Status:** Drafted

---

## 1. Purpose

This document defines when `ntn-sim-core` may use engineering assumptions and how those assumptions must be recorded.

The goal is to allow necessary progress without letting undocumented guesses become fake research realism.

---

## 2. When Assumptions Are Allowed

Assumptions are allowed only when at least one of the following is true:

1. the source paper or standard does not specify the value;
2. the source literature gives a range but not a single mandatory default;
3. an implementation placeholder is needed before a later paper-backed upgrade;
4. a showcase curation choice must be made without changing physics.

Assumptions are not allowed to overwrite an explicit value that already exists in:

1. the selected source paper;
2. the selected standard baseline;
3. the active profile definition.

---

## 3. Assumption Categories

| Category | Meaning | Allowed Claim Scope |
|---|---|---|
| `parameter assumption` | fills a missing parameter value | benchmark only with disclosure |
| `range selection assumption` | chooses one value from a source-backed range | benchmark only with disclosure |
| `placeholder assumption` | temporary engineering stand-in before a paper-backed implementation lands | local development only unless explicitly approved |
| `curation assumption` | chooses observer/window for showcase readability without changing physics | showcase only |

Placeholder assumptions must not be used for final paper figures.

---

## 4. Required Assumption Identifier

Each long-lived assumption must have an identifier:

`ASSUME-<AREA>-<NNN>`

Suggested area codes:

1. `ORB`
2. `CHAN`
3. `BEAM`
4. `HO`
5. `EE`
6. `KPI`
7. `TRAF`
8. `OBS`
9. `CUR`

Example:

`ASSUME-BEAM-001`

---

## 5. Required Metadata

Every assumption entry must include:

1. identifier
2. category
3. affected profile or module
4. chosen value or rule
5. unit, if applicable
6. rationale
7. impact scope
8. allowed claim scope
9. replacement target, if known

If the assumption is tied to a run rather than a profile default, it must also appear in run metadata.

---

## 6. Storage Rules

Assumptions must be recorded in the narrowest valid scope:

1. profile-default assumptions belong in profile/source-trace metadata;
2. run-specific assumptions belong in the run manifest or resolved config;
3. showcase curation assumptions belong in replay or curation metadata;
4. long-lived architectural assumptions may also be summarized in SDD companion documents.

No KPI-impacting assumption may exist only in code comments or commit messages.

---

## 7. Claim Policy

### 7.1 Allowed

Assumption-backed choices may support:

1. benchmark experiments with explicit disclosure;
2. ablation studies;
3. engineering comparisons;
4. showcase curation that does not alter physics.

### 7.2 Not Allowed

Assumption-backed choices must not be framed as:

1. exact paper replication when the source paper gave a different explicit value;
2. standard-mandated behavior if the standard was not actually followed;
3. real-trace realism derived from TLE alone when radio parameters were assumed.

---

## 8. Retirement Rule

An assumption should be retired when:

1. a paper-backed or standard-backed value becomes available;
2. the implementation reaches the phase where placeholder behavior is no longer acceptable;
3. a validation gate requires a stronger source basis.

When an assumption is retired, the replacement source must be recorded in source-trace metadata.

---

## 9. Assumption Register (2026-03-23)

Assumptions introduced during academic hardening that are not directly from a single paper value:

| ID | Module | Assumption | Justification | Claim Limit |
|---|---|---|---|---|
| ASSUME-KA-SF-001 | `shadow-fading.ts` | Ka-band suburban LOS/NLOS σ_SF and CL values | Derived from 3GPP TR 38.811 Table 6.6.2-1 general Ka-band range; exact table access not available in paper corpus | `provisional` — replace with exact table if standard PDF obtained |
| ASSUME-ATM-001 | `link-budget.ts` | Atmospheric loss: zenith gaseous 0.35/0.6 dB, rain 0.8/1.5 dB, scintillation 0.4 dB | Simplified from ITU-R P.676/P.618 typical values; not a full ITU-R calculation | `provisional` — sufficient for interference-limited scenarios where atmospheric loss is secondary |
| ASSUME-SR-001 | `small-scale-fading.ts` | Shadowed-Rician parameters (m, b₀, Ω) per elevation | Based on PAP-2021-SHADOWED-RICIAN Table II structure; specific numeric values are representative suburban S-band | `provisional` — paper-specific profiles should override if paper provides explicit SR parameters |
| ASSUME-TIMER-CHO-001 | `cho.ts` | Timer-CHO geometry timer = α × TTT (simplified) | Full model requires beam radius, UE position in beam, satellite velocity — not available in HO manager scope | disclosed simplification; full geometry timer needs engine-level data |
| ASSUME-HOBS-EIRP-001 | `defaults.ts` | HOBS EIRP density 46 dBW/MHz (vs paper's unspecified EIRP) | Ka-band FSPL is ~22 dB higher than S-band; S-band baseline 34 + 12 = 46 compensates partially | `provisional` — replace with paper-specific EIRP when available |
| ASSUME-BH-CONST-001 | `defaults.ts` | BH constellation 324 sats (18×18) vs paper's 66 (6×11) | Original 66 sats gave 13% availability at 40°N; 324 provides ≥80% coverage | engineering adjustment — paper reproduction would use paper's exact constellation |
| ASSUME-HOBS-FRF-001 | `defaults.ts` | HOBS FRF=3, 19 beams (vs original FRF=1, 37 beams) | 37-beam FRF=1 produces -20 dB mean SINR (catastrophic interference); FRF=3 is standard multi-beam configuration | engineering adjustment — paper reproduction would use paper's explicit FRF if stated |
