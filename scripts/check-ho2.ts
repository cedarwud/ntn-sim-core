import { loadProfile } from '@/core/profiles';
import { generateWalkerConstellation } from '@/core/orbit';
import { buildTrajectoryCache } from '@/core/orbit/trajectory-cache';
import { createSimEngine } from '@/core/engine';

const prof = loadProfile('hobs-multibeam-baseline');
const elements = generateWalkerConstellation({
  shells: [{ id: 'shell-0', altitudeKm: prof.orbital.altitude_km, inclinationDeg: prof.orbital.inclination_deg, planes: prof.orbital.num_planes, satsPerPlane: prof.orbital.sats_per_plane }],
  epochUtcMs: prof.timeControl.epochUtcMs,
});
const cache = buildTrajectoryCache({ elements, observerLatDeg: prof.observer.latitudeDeg, observerLonDeg: prof.observer.longitudeDeg, observerAltKm: prof.observer.altitudeM / 1000, durationSec: prof.timeControl.durationSec, stepSec: 10, epochUtcMs: prof.timeControl.epochUtcMs });
const eng = createSimEngine({ profile: prof, trajectoryCache: cache });

let prevServing = '';
let hoCount = 0;
for (let t = 0; t <= 3600; t += 1) {
  const snap = eng.tick(t, t);
  const ue = snap.ues[0];
  const serving = ue?.servingSatId ?? 'null';
  const sinr = ue?.sinrDb;
  
  if (serving !== prevServing) {
    const sat = snap.satellites.find(s => s.id === serving);
    console.log(`t=${t}s: ${prevServing || '(none)'} → ${serving} sinr=${sinr?.toFixed(1)} el=${sat?.elevationDeg?.toFixed(1) ?? '?'}°`);
    if (prevServing && serving !== 'null') hoCount++;
    prevServing = serving;
  }
}
console.log(`\nTotal handovers: ${hoCount}`);
