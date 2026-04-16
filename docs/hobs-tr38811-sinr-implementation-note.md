# HOBS + TR 38.811 SINR Implementation Note

Last Updated: `2026-04-15`

## 1. Purpose

This note explains, in reviewer-facing terms, how the simulator implements the
`hobs-tr38811-research` SINR path:

1. the **outer SINR structure** follows the HOBS signal / interference / noise split;
2. the **slant-range path** can follow `3GPP TR 38.811 Eq. (6.6-3)` via `d(alpha)`;
3. the **frontend does not recompute SINR** and only renders engine truth.

This is the document to use when a reader asks:

1. "Did you really put the SINR formula into the simulator?"
2. "Which parts are constants, profile settings, or dynamic variables?"
3. "How are interference and channel gain handled?"
4. "What is the relationship between elevation angle, off-axis angle, and slant range?"
5. "Does the UI directly affect the SINR value?"

## 2. Short Answer

For `hobs-tr38811-research`, the simulator computes SINR in the engine, not in
the UI.

The runtime structure is:

\[
\mathrm{SINR}_{n,m,k}(t) =
\frac{S_{n,m,k}(t)}{I^{a}_{n,m,k}(t) + I^{b}_{n,m,k}(t) + N_k}
\]

with the following implementation split:

1. `S`, `I^a`, and `I^b` are built from **received-power calls** in the channel step.
2. Received power is built from **geometry + path loss + receive gain + beam-pattern delta + optional DPC power override**.
3. In the research profile, slant range can be replaced by the explicit
   `TR 38.811 Eq. (6.6-3)` function `d(alpha)`.
4. The frontend only displays `snapshot.ues[*].sinrDb` and does not perform a
   second SINR computation.
5. The right-top `Primary SINR` is the **instantaneous SINR of the primary UE**,
   not a run-average KPI such as `meanSinrDb`.

The most likely reviewer concern is **interference**, not the existence of the
outer SINR formula. The outer aggregation is straightforward; the difficult part
is building the correct serving / intra-satellite / inter-satellite power sets
for each tick and each beam.

## 3. End-to-End Truth Path

The runtime truth chain is:

1. `src/core/engine/tick.ts`
   - advances UE mobility
   - samples orbit / visibility
   - runs scheduler
   - computes channel / SINR
   - runs handover, KPI, energy, policy
   - writes the snapshot
2. `src/core/engine/channel-step.ts`
   - selects the serving beam for the current UE truth path
   - enumerates intra- and inter-satellite interferers
   - calls received-power helpers for every signal / interference term
3. `src/core/engine/channel-sinr-helpers.ts`
   - resolves `alpha`, `theta`, slant range, LOS/NLOS, path loss, beam gain,
     and optional per-beam TX-power override
4. `src/core/models/sinr.ts`
   - sends the final power lists into the standard SINR model
5. `src/core/channel/sinr.ts`
   - converts dBm powers to linear scale
   - sums interference and noise
   - computes the final SINR
6. `src/core/engine/snapshot-step.ts`
   - stores `ue.sinrDb` in the `SimulationSnapshot`
7. `src/viz/scene/SceneShell.tsx`
   - passes the snapshot to the overlay
8. `src/viz/overlays/HandoverExplainabilityPanel.tsx`
   - renders the right-top `Primary SINR` label from `snapshot.ues[0].sinrDb`

This means the displayed `Primary SINR` is not a frontend-side estimate. It is
engine truth that has already passed through the runtime channel and SINR path.

## 4. Paper Symbols vs. Runtime Fields

| Paper-side concept | Runtime meaning | Main implementation surface |
|---|---|---|
| `alpha` | elevation angle between UE and satellite | `src/core/channel/slant-range.ts`, `src/core/orbit/topocentric.ts` |
| `theta` | off-axis angle between beam center and UE | `src/core/channel/beam-gain.ts` |
| `d(alpha)` | slant range from `TR 38.811 Eq. (6.6-3)` | `src/core/channel/slant-range.ts` |
| `G_0` | peak antenna gain | HOBS profile RF/antenna defaults |
| `G_T(theta)` | beam-pattern term | `src/core/channel/beam-gain.ts` |
| `G_R` | UE receive gain | `profile.rf.ue_antenna_gain_dbi` |
| `P_{n,m}(t)` | per-beam transmit power | fixed profile TX power or DPC-adjusted beam override |
| `H` or channel gain | runtime composition of path loss and geometry-dependent attenuation | `src/core/models/path-loss.ts`, `src/core/channel/link-budget.ts`, `src/core/engine/channel-sinr-helpers.ts` |
| `S` | serving-link received power | `computeReceivedPowerDbm()` for the serving beam |
| `I^a` | same-satellite co-channel beam interference | multi-beam intra list in channel step |
| `I^b` | other-satellite beam interference | multi-beam inter list in channel step |
| `N` | thermal noise | `state.noiseDbm` from bootstrap |

## 5. What "H" Means in This Simulator

In the paper, readers often think of `H` as one symbol.

In the simulator, `H` is **not** a single stored field. It is realized by a
chain of runtime transformations:

\[
d \leftarrow d(\alpha) \text{ or geometry range}
\]

\[
L = L_{\mathrm{FSPL}} + L_{\mathrm{impl}} + L_{\mathrm{shadow}} +
L_{\mathrm{clutter}} + L_{\mathrm{atm}} - L_{\mathrm{small\text{-}scale}}
\]

\[
P_{\mathrm{rx}} = \mathrm{txEirp} + G_R - L + \Delta G_T(\theta)
\]

where:

1. `txEirp` already contains the peak beam gain reference used by the profile;
2. `Delta G_T(theta)` is the beam-pattern delta relative to boresight;
3. the path-loss adapter intentionally excludes Tier-3 beam gain, and beam gain
   is added afterward in the engine helper.

This split is important:

1. the **path-loss model** owns the range / elevation / LOS-dependent loss path;
2. the **beam-gain model** owns the off-axis beam pattern;
3. the **SINR model** only owns aggregation.

That division is explicit in:

1. `src/core/models/path-loss.ts`
2. `src/core/channel/link-budget.ts`
3. `src/core/channel/beam-gain.ts`
4. `src/core/models/sinr.ts`

## 6. The Two Angles and the Slant Range

### 6.1 `alpha` is elevation, not off-axis angle

`TR 38.811 Eq. (6.6-3)` uses:

\[
d(\alpha) =
\sqrt{R_E^2 \sin^2 \alpha + h_0^2 + 2 h_0 R_E} - R_E \sin \alpha
\]

In the simulator:

1. `alpha` means **elevation angle**
2. it is computed from topocentric geometry
3. it can be used to derive slant range explicitly in research mode

This is implemented in:

1. `src/core/channel/slant-range.ts`
2. `src/core/engine/channel-sinr-helpers.ts`

### 6.2 `theta` is beam off-axis angle

HOBS beam gain uses the beam-center-to-UE offset angle:

1. `theta` is **not** the same angle as `alpha`
2. it is computed from beam center latitude / longitude, UE latitude /
   longitude, and satellite altitude
3. it feeds the Bessel `J1 + J3` beam-pattern path

This is implemented in:

1. `src/core/channel/beam-gain.ts`

### 6.3 Practical runtime interpretation

In `hobs-tr38811-research`, the received-power path is best understood as:

\[
P_{\mathrm{rx}} = f(\alpha, d(\alpha), \theta, P_{n,m}(t), G_R, \text{channel tiers})
\]

So the runtime SINR is not just "a function of distance."

It is a function of:

1. elevation angle `alpha`
2. slant range `d(alpha)` or geometric range
3. beam off-axis angle `theta`
4. serving / interfering beam selection
5. optional beam-level DPC power override

## 7. Where Slant Range Comes From

The runtime has two slant-range modes:

1. `geometry`
   - use topocentric `rangeKm` directly from the orbit / observer geometry
2. `tr38811-elevation`
   - use `TR 38.811 Eq. (6.6-3)` to derive `d(alpha)` from elevation

For `hobs-tr38811-research`, the profile selects:

1. `channel.slant_range_mode = 'tr38811-elevation'`
2. `channel.ue_geometry_mode = 'per-ue-topocentric'`

So the runtime process is:

1. compute per-UE elevation from topocentric geometry
2. replace the slant range with explicit `d(alpha)`
3. feed that slant range into FSPL and the rest of the path-loss chain

This matters for defense because it shows the formula is not merely cited; it is
actively used as the link-distance input to the runtime channel path.

## 8. How Channel Gain Is Computed

### 8.1 Path-loss side

The path-loss adapter calls `computeLinkBudget()` with:

1. `distanceKm`
2. `frequencyGhz`
3. `elevationDeg`
4. `environment`
5. `isLos`
6. `txEirpDbm`
7. `rxAntennaGainDb`
8. `implementationLossDb`
9. tier enable flags

The composed loss is:

1. FSPL
2. large-scale shadow fading
3. clutter loss when NLOS
4. atmospheric loss for extended Ka-band mode
5. optional small-scale fading

The path-loss adapter returns:

1. `rxPowerDbm`
2. `totalPathLossDb`
3. component breakdowns

### 8.2 Beam-gain side

Beam gain is handled separately from path loss.

For the HOBS profiles:

1. the antenna model is `bessel-j1j3`
2. the beam pattern returns `0 dB` at boresight
3. off-axis positions return negative beam-pattern deltas

So the runtime interpretation is:

1. `G_0 = 40 dBi` is already absorbed into `txEirp`
2. `computeBeamGain()` adds the pattern delta `Delta G_T(theta)`

This is one reason channel gain is easier to defend than interference:

1. channel gain is a mostly local link computation
2. interference must assemble many such link computations into the correct sets

## 9. Noise Power

Noise is computed once during engine bootstrap:

\[
N_{\mathrm{dBm}} =
-228.6 + 10 \log_{10}(T_{\mathrm{sys}}) + 10 \log_{10}(B) + 30
\]

where:

\[
T_{\mathrm{sys}} = T_{\mathrm{noise}} + 290 \cdot (\mathrm{NF}_{\mathrm{linear}} - 1)
\]

For the HOBS-family profiles:

1. `bandwidth = 100 MHz`
2. `noise_temperature_k = 290`
3. `noise_figure_db = 0`

These are fixed for the run unless the profile changes. They do not move with
the camera or beam rendering.

## 10. How the Outer SINR Is Computed

The final aggregator converts each dBm value to linear scale, then computes:

\[
\mathrm{SINR} =
\frac{S}{I_{\mathrm{intra}} + I_{\mathrm{inter}} + N}
\]

and finally subtracts Doppler-induced ICI degradation when enabled.

This is implemented in:

1. `src/core/channel/sinr.ts`
2. `src/core/models/sinr.ts`

So the core mapping to HOBS is:

1. signal power list building happens in the engine
2. power aggregation happens in the SINR model
3. UI only consumes the result

## 11. Interference: The Most Likely Reviewer Concern

Yes, interference is the most likely place for questions, because it is the
least "one-line formula" part of the implementation.

### 11.1 Why interference is the hardest part

To implement interference, the simulator must decide:

1. which beam is serving
2. which other beams on the same satellite are co-channel
3. which beams on other satellites are active interferers
4. which TX power each interfering beam uses
5. which geometry and beam angle each interfering link should use

Each of these decisions is dynamic.

### 11.2 Intra-satellite interference `I^a`

For multi-beam runs:

1. start from the selected serving beam
2. enumerate the other beams in the same satellite beam layout
3. if `FRF != 1`, keep only beams in the same reuse group as the serving beam
4. compute received power for each surviving beam using the same serving sample
   but that beam's own off-axis angle and beam ID
5. sum the resulting powers in linear scale

This means the same-satellite interference is not a fixed constant. It depends
on:

1. which beam is serving now
2. that beam's reuse group
3. the UE position inside the beam lattice
4. any beam-level TX-power override

### 11.3 Inter-satellite interference `I^b`

For multi-beam runs:

1. rank other visible satellites by elevation
2. keep all of them in the research profile because
   `max_interfering_sats = null`
3. use each other satellite's selected best beam as the interference beam
4. compute the cross-satellite off-axis angle from the other satellite subpoint
   to the UE position
5. compute received power for each interfering beam and sum in linear scale

This is why interference is more complex than channel gain:

1. channel gain is one link
2. interference is a **set of many links**, each with its own geometry and beam
   identity

### 11.4 Dynamic power on interferers

For `hobs-tr38811-research`, interferers do not all share one fixed whole-
satellite DPC seed anymore.

The current rule is:

1. if a beam has UE evidence, it can get a beam-associated DPC power seed
2. if it does not, it falls back to fixed profile power

This is implemented by:

1. collecting beam power seeds from UE candidate truth and the forced serving
   lattice
2. translating those seeds into per-beam TX-power overrides
3. reading those overrides back in the received-power path

This is materially closer to `P_{n,m}(t)` than the older whole-satellite seed
proxy, but it is still not a full constellation-wide beam-native scheduler /
controller.

## 12. Fixed Values vs. Dynamic Values

### 12.1 Fixed for the run

These come from the profile and do not change during one run unless the user
changes the profile or parameters:

1. `frequency_ghz`
2. `bandwidth_mhz`
3. `tx_power_per_beam_dbm`
4. `max_tx_power_dbm`
5. `peak_gain_dbi`
6. `beam_diameter_km`
7. `num_beams`
8. `FRF`
9. `deployment_environment`
10. `large_scale_model`
11. `implementation_loss_db`
12. `ue_antenna_gain_dbi`
13. `los_mode`
14. `slant_range_mode`
15. `ue_geometry_mode`
16. `power_coupling_mode`

### 12.2 Derived once at bootstrap

These are computed once when the engine starts:

1. `txEirp`
2. `noiseDbm`
3. initial UE positions
4. model bundle wiring

### 12.3 Dynamic per tick

These can change every simulation tick:

1. UE latitude / longitude
2. visible satellites
3. satellite elevation and range
4. selected serving satellite / serving beam
5. beam center offsets in earth-moving tracking
6. intra/interference membership
7. per-beam DPC overrides
8. SINR

### 12.4 Dynamic per link evaluation

These are not global state values; they are recomputed for a specific link:

1. off-axis angle `theta`
2. effective elevation `alpha`
3. effective slant range
4. LOS/NLOS state
5. path-loss breakdown
6. beam-pattern delta
7. received power

## 13. Which Quantities Follow Scene Motion

This point needs careful wording in a thesis defense.

Some values change while the scene is animating, but they do **not** change
because the frontend draws them.

They change because the **engine state advances**.

### 13.1 Values that move with simulation truth

These change as time advances:

1. satellite position
2. UE position
3. elevation angle
4. slant range
5. off-axis angle
6. LOS/NLOS state
7. received power
8. SINR

### 13.2 Values that are visual-only

These do not change physics:

1. camera angle
2. beam material / opacity / label visibility
3. scene projection choices
4. visual overlays themselves

The frontend-beam visual SDD explicitly requires that beam/SINR overlays read
snapshot truth and must not recompute channel state in the browser.

## 14. Frontend Relationship

### 14.1 What the frontend does

The frontend:

1. receives `SimulationSnapshot`
2. displays `snapshot.ues[0].sinrDb` as `Primary SINR`
3. may also display serving satellite, beam, range, and elevation from snapshot
   / explainability truth

This means the right-top panel is:

1. primary UE only
2. instantaneous tick truth
3. not the same metric as the aggregate KPI bundle's `meanSinrDb`

### 14.2 What the frontend does not do

The frontend does not:

1. compute FSPL
2. compute beam gain
3. compute interference
4. compute SINR
5. alter the engine's serving or interfering link sets

So if a reviewer asks whether the angle or range is "directly related to the
frontend," the correct answer is:

1. the frontend can **display** those quantities
2. but the quantities come from engine truth
3. camera movement or rendering choices do not feed back into SINR

## 15. Profile-Specific HOBS / TR 38.811 Anchors

For `hobs-tr38811-research`, the key run-fixed anchors are:

1. `550 km` altitude
2. `28 GHz` carrier
3. `100 MHz` bandwidth
4. `50 dBm` per-beam TX power
5. `40 dBi` peak antenna gain
6. `37` beams
7. `FRF = 3`
8. `G_R = 0 dBi`
9. `gamma_thr = 10 dB`
10. `gamma_os = 6 dB`
11. HOBS `bessel-j1j3` antenna model
12. `TR 38.811 Eq. (6.6-3)` slant-range mode
13. `TR 38.811 Table 6.6.1-1` LOS probability mode
14. per-UE topocentric geometry
15. full inter-satellite interferer sum
16. beam-associated DPC power override where beam-level evidence exists

## 16. Known Approximations and Review Boundaries

This profile is stronger than a generic platform baseline, but it is still not
an "exact HOBS replica."

Known boundaries include:

1. the constellation shell is a disclosed synthetic Walker closure rather than a
   paper-published plane-by-plane layout
2. `FRF = 3` is a disclosed closest paper-backed reuse assumption rather than a
   direct HOBS Table I value
3. DPC is beam-associated where evidence exists, with fixed-power fallback for
   unmatched beams
4. LOS sampling uses deterministic per-link Bernoulli evaluation from the
   TR 38.811 probability table rather than an external stochastic trace source
5. the runtime uses the actual code path split of `txEirp`, implementation
   losses, and beam-gain delta rather than a literal single-symbol channel-gain
   variable named `H`

### 16.1 Code-level accounting note that may draw questions

One symbol-level question can arise around `txEirp` and implementation loss.

Current runtime behavior is:

1. bootstrap derives `txEirp` from the profile RF path
2. received-power computation then also passes `implementationLossDb` into the
   path-loss adapter

So if a reviewer asks for a literal one-line symbol map, the correct defense is:

1. thesis notation should describe the **implemented accounting path**
2. the simulator does not store one single scalar field called `H`
3. instead, effective received power comes from the composed runtime chain
   documented above

If a future paper needs stricter symbol-by-symbol normalization, this is a good
candidate for a small cleanup patch and an explicit before/after disclosure.

If a reviewer asks whether the simulator is "exactly the same as the paper,"
the correct answer is:

1. the **outer SINR structure** and major parameter envelope are paper-aligned
2. the **propagation closure** is strengthened with explicit TR 38.811 geometry
   and LOS rules
3. some runtime closure details remain simulator-authored assumptions

## 17. Reviewer Q&A Checklist

### Q1. Is the formula really in the simulator?

Yes.

1. serving, intra-interference, inter-interference, and noise are explicitly
   assembled in the engine
2. the final ratio is computed in the SINR model
3. the UI only reads the result

### Q2. Is interference really implemented, or just approximated by one number?

It is implemented as explicit received-power lists, not as one fixed penalty.

1. same-satellite co-channel beams are enumerated separately
2. other-satellite interferers are enumerated separately
3. each interferer gets its own received-power computation

### Q3. Is channel gain easier to justify than interference?

Usually yes.

1. channel gain is a local link-budget composition
2. interference requires correct set construction across many links and beams

### Q4. Are `alpha` and `theta` the same?

No.

1. `alpha` is elevation
2. `theta` is off-axis beam angle
3. `d(alpha)` comes from `alpha`, not from `theta`

### Q5. Does the frontend directly affect SINR?

No.

1. the frontend renders truth
2. the engine computes SINR
3. visualization does not feed back into channel state

### Q6. What should be emphasized in a paper defense?

Emphasize these points:

1. HOBS outer SINR structure is implemented in the engine
2. TR 38.811 `d(alpha)` is explicitly injected into the propagation path
3. interference is enumerated as explicit link powers
4. the UI is truth-consuming, not truth-generating
5. known approximations are disclosed rather than hidden

### Q7. Is `Primary SINR` the same thing as mean SINR?

No.

1. `Primary SINR` is `snapshot.ues[0].sinrDb`
2. it is one UE, one tick, instantaneous truth
3. `meanSinrDb` is an aggregate KPI over the run

## 18. Recommended Citation Strategy Inside This Repo

When defending the implementation, point to these surfaces together:

1. `src/core/engine/tick.ts`
2. `src/core/engine/channel-step.ts`
3. `src/core/engine/channel-sinr-helpers.ts`
4. `src/core/channel/slant-range.ts`
5. `src/core/channel/los-probability.ts`
6. `src/core/channel/beam-gain.ts`
7. `src/core/channel/sinr.ts`
8. `src/core/models/path-loss.ts`
9. `src/core/engine/snapshot-step.ts`
10. `src/viz/overlays/HandoverExplainabilityPanel.tsx`
11. `sdd/ntn-sim-core-frontend-beam-visual-sdd.md`
12. `src/core/profiles/defaults-hobs.ts`

That set is enough to show:

1. where the formula enters the engine
2. where the profile fixes paper-backed constants
3. where the geometry and channel terms are realized
4. where the UI only consumes truth
