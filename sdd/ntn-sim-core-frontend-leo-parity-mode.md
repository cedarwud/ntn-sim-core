# NTN Sim Core — Frontend Leo-Parity Mode SDD

**Version:** 0.2.0
**Date:** 2026-03-26
**Status:** CLOSED — experiment concluded, merged useful parts into main view, removed dual-mode system

---

## Closure Note

This document previously defined a post-closure frontend enhancement track to add a `leo-parity` presentation mode that would read closer to `project/leo-beam-sim`.

**Outcome (2026-03-26):** The experiment has been concluded. The dual view-mode system (`ViewMode: 'default' | 'leo-parity'`) was removed. Useful satellite selection logic from the parity presenter was extracted into `src/viz/beam/beam-selection.ts` and is now used by the single unified view.

### What was removed

- `ViewMode` type and `?view=` query param
- `ControlPanel` view toggle
- `LeoParityBeamLayer.tsx`
- `LeoParityBeamOverlay.tsx`
- `LeoParityHandoverLinks.tsx`
- `src/viz/presenters/leo-parity-presenter.ts`
- `src/viz/presenters/types.ts`
- `parityMode` prop from `EarthFixedCellLayer`
- `BeamSelectionEmphasis` type and emphasis system
- Profile/view/presenter query params

### What was kept (merged into main view)

- Beam satellite selection logic now lives in `src/viz/beam/beam-selection.ts` (`selectBeamSatellites()`, `selectCellCandidateSatIds()`)
- Single hardcoded profile: `hobs-multibeam-baseline`
- All existing overlays (`BeamInfoOverlay`, `HandoverLinkOverlay`) continue to work unchanged

### Current frontend beam architecture

See `sdd/ntn-sim-core-implementation-status.md` §8 for the authoritative component list.
