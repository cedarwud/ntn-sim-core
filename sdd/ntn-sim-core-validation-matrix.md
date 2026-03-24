# NTN Sim Core — Validation Matrix

**Version:** 0.1.0  
**Date:** 2026-03-20  
**Status:** Planned

---

## 1. Purpose

This matrix defines the validation checks required before `ntn-sim-core` can make research claims or rely on visualization for interpretation.

Operational merge, benchmark, and showcase acceptance rules are further constrained by:

1. `sdd/ntn-sim-core-development-constraints.md`
2. `sdd/ntn-sim-core-acceptance-gates.md`
3. `sdd/ntn-sim-core-assumption-policy.md`

---

## 2. Validation IDs

| ID | Category | Check | Phase |
|---|---|---|---|
| `VAL-ARCH-001` | architecture | `src/core/**` contains no React/Three imports | 0 |
| `VAL-ARCH-002` | architecture | physical parameters and visual-only parameters are separated | 0 |
| `VAL-CONF-001` | config | profile + override resolution is serializable and deterministic | 0 |
| `VAL-TRACE-001` | traceability | each run emits manifest, resolved config, and source-trace skeleton | 0 |
| `VAL-RNG-001` | reproducibility | same seed/profile yields identical orbit snapshots | 1 |
| `VAL-ORB-001` | orbit | synthetic orbit positions are stable across headless and frontend paths | 1 |
| `VAL-ORB-002` | geometry | slant range, azimuth, and elevation outputs match formula checks | 1 |
| `VAL-VIZ-001` | visualization | replayed orbit timeline matches stored trace ordering and time offsets | 1 |
| `VAL-CHAN-001` | channel | FSPL baseline matches reference calculations | 2 |
| `VAL-CHAN-002` | channel | 3GPP NTN large-scale loss composition is traceable by profile | 2 |
| `VAL-BEAM-001` | beam geometry | earth-moving beam footprint projection matches the declared access-profile geometry contract | 2 |
| `VAL-HO-001` | handover | hard HO baseline is deterministic under fixed seed/config | 2 |
| `VAL-HO-002` | handover | A3/A4 or CHO/MC-HO trigger reasons appear in event traces | 2 |
| `VAL-KPI-001` | KPI | KPI totals are identical between headless and replay-based recomputation | 2 |
| `VAL-GOLDEN-001` | golden cases | profile-specific access golden cases exist for orbit/channel/HO reference points | 2 |
| `VAL-MB-001` | multibeam | active-beam restriction changes serviceability deterministically | 3 |
| `VAL-SINR-001` | signal | interference-aware multi-beam SINR path matches profile-selected formula family | 3 |
| `VAL-EE-001` | energy | energy layer 1 outputs appear in benchmark artifacts and are reproducible | 3 |
| `VAL-GOLDEN-002` | golden cases | profile-specific multibeam golden cases exist for HOBS-style signal and active-beam paths | 3 |
| `VAL-RT-001` | real-trace | TLE-derived replay uses the same channel/HO/KPI stack as synthetic mode | 4 |
| `VAL-RT-002` | replay | replay manifest reconstructs the same selected time window and event timing | 4 |
| `VAL-CUR-001` | curation | showcase window selection is deterministic and recorded in metadata | 4 |
| `VAL-BH-001` | beam hopping | BH scheduler decisions are explicit per slot and replayable | 5 |
| `VAL-EE-002` | energy | energy layer 2 can block service independently of geometry | 5 |
| `VAL-EXP-001` | explainability | overlays can distinguish low-SINR, inactive-beam, and energy-blocked service loss | 5 |
| `VAL-DAPS-001` | continuity | DAPS/DC-like state transitions are logged and replayable | 6 |
| `VAL-DAPS-002` | continuity | DAPS-enabled run shows measurable continuity difference versus baseline under same scenario | 6 |

### Remediation Gates (added 2026-03-21, from academic-remediation.md)

| ID | Category | Check | Remediation Item |
|---|---|---|---|
| `VAL-SINR-002` | signal | each interfering satellite uses its own slant range for path loss computation | C1 |
| `VAL-HO-003` | handover | CHO state transitions (cho-prepared, cho-executing) appear in event traces | C2 |
| `VAL-HO-004` | handover | MC-HO dual-connectivity events appear in event traces | C2 |
| `VAL-UE-001` | multi-UE | N>1 UEs produce distinct SINR values per tick | C3 |
| `VAL-UE-002` | multi-UE | Jain fairness index < 1.0 for N>1 UEs with different positions | C3 |
| `VAL-CHAN-003` | channel | Ka-band profile uses Ka-band shadow fading parameters, not S-band | M3 |
| `VAL-CHAN-004` | channel | Tier 4 atmospheric loss > 0 when enabled for Ka-band | M4 |
| `VAL-FADING-001` | channel | Tier 5 Shadowed-Rician fading produces non-zero variance under non-deterministic channel | MS1 |
| `VAL-PROFILE-001` | profiles | all profile altitude_km values match cited source papers | profile fix |

### Physics Model Gates (added 2026-03-21, from academic-remediation.md §9)

| ID | Category | Check | Remediation Item |
|---|---|---|---|
| `VAL-DOPPLER-001` | channel | Doppler shift computation produces ±24 kHz at S-band / ±336 kHz at Ka-band for LEO 550km | P1 |
| `VAL-DELAY-001` | handover | handover TTT includes propagation delay (RTT) from slant range | P2 |
| `VAL-TRAFFIC-001` | traffic | BH scheduler receives non-zero per-cell demand from traffic generator | P3 |
| `VAL-MOBILITY-001` | UE | UE position changes over time when speed_kmh > 0 | P4 |

### Methodology Gates (added 2026-03-21, from academic-remediation.md §10)

| ID | Category | Check | Remediation Item |
|---|---|---|---|
| `VAL-REPRO-001` | reproduction | at least one reference paper result reproduced within stated tolerance | MG1 |
| `VAL-POLICY-001` | RL interface | engine exposes getObservation() and applyAction() for external policy | MG2 |

---

## 3. Validation Level Split (MG4)

Each validation check operates at one of two levels:

| Level | Suffix | Meaning | Test Infrastructure |
|---|---|---|---|
| **Formula** | `-F` | Isolated formula check, standalone script re-implements math | `validate-runtime.mjs`, `golden-case-*.mjs` |
| **Engine** | `-E` | End-to-end engine path check, runs actual `engine.ts` tick loop | `benchmark-runner` (headless), future `validate-integration.mjs` |

### Current Coverage

| VAL ID | Level | Script |
|---|---|---|
| VAL-RNG-001 | F | validate-runtime.mjs |
| VAL-ORB-002 | F | validate-runtime.mjs, golden-case-orbit.mjs |
| VAL-CHAN-001 | F | validate-runtime.mjs, golden-case-channel.mjs |
| VAL-CHAN-002 | F | golden-case-channel.mjs |
| VAL-HO-001 | F | validate-runtime.mjs |
| VAL-SINR-001 | F | validate-runtime.mjs |
| VAL-SINR-002 | F | validate-runtime.mjs |
| VAL-EE-001 | F | validate-runtime.mjs |
| VAL-EE-002 | F | validate-runtime.mjs |
| VAL-BH-001 | F | validate-runtime.mjs |
| VAL-DAPS-002 | F | validate-runtime.mjs |
| VAL-HO-003 | F | validate-runtime.mjs |
| VAL-HO-004 | F | validate-runtime.mjs |
| VAL-UE-001 | F | validate-runtime.mjs |
| VAL-UE-002 | F | validate-runtime.mjs |
| VAL-CHAN-003 | F | validate-runtime.mjs |
| VAL-CHAN-004 | F | validate-runtime.mjs |
| VAL-FADING-001 | F | validate-runtime.mjs |
| VAL-ARCH-001 | structural | validate-core-purity.mjs |
| VAL-ARCH-002 | structural | validate-structure.mjs |

**Note:** All current checks are **Formula-level (-F)** or **structural**. Engine-level (-E) checks require a headless benchmark runner that exercises the full `engine.ts → KPI` path. This is tracked as future work — the `-F` level already covers mathematical correctness of individual formulas.

---

## 4. Reference Numeric Checkpoints

These checks are formula-level checkpoints with explicit assumptions. They are intentionally narrower than full paper-result replication.

| Ref ID | Assumptions | Expected Result |
|---|---|---|
| `REF-ORB-001` | circular orbit, `R_E = 6378.137 km`, `h = 550 km`, `mu = 398600.4418 km^3/s^2` | orbital period `≈ 95.65 min`, speed `≈ 7.585 km/s` |
| `REF-CHAN-001` | FSPL with `f = 2000 MHz`, `d = 600 km` slant range | path loss `≈ 154.03 dB` |

Global SINR checkpoints are not defined here, because SINR depends on the full parameter stack:

1. antenna gain family
2. interference set
3. beam activity
4. bandwidth and noise assumptions
5. large-scale and optional small-scale model choices

Paper-family SINR targets should therefore be implemented as `golden cases`, not as context-free global constants.

---

## 4. Gate Usage

### Phase Gate

Each phase must pass:

1. all earlier-phase validation IDs
2. all validation IDs assigned to the current phase

### Research Claim Gate

Any figure or table intended for a paper must be supported by:

1. the corresponding phase gate
2. saved manifests and artifacts
3. source-trace references for every KPI-impacting model family used in that result

### Showcase Gate

Any showcase/demo sequence must additionally prove:

1. the replay window was selected deterministically
2. visual controls did not alter physical outcomes
3. the event sequence can be regenerated from replay metadata
