import { loadProfile } from '@/core/profiles';
import { generateWalkerConstellation } from '@/core/orbit';
import { buildTrajectoryCache } from '@/core/orbit/trajectory-cache';
import { createSimEngine } from '@/core/engine';

const prof = loadProfile('hobs-multibeam-baseline');
const elements = generateWalkerConstellation({
  shells: [{
    id: 'shell-0',
    altitudeKm: prof.orbital.altitude_km,
    inclinationDeg: prof.orbital.inclination_deg,
    planes: prof.orbital.num_planes,
    satsPerPlane: prof.orbital.sats_per_plane,
  }],
  epochUtcMs: prof.timeControl.epochUtcMs,
});
const cache = buildTrajectoryCache({
  elements,
  observerLatDeg: prof.observer.latitudeDeg,
  observerLonDeg: prof.observer.longitudeDeg,
  observerAltKm: prof.observer.altitudeM / 1000,
  durationSec: prof.timeControl.durationSec,
  stepSec: 10,
  epochUtcMs: prof.timeControl.epochUtcMs,
});
const eng = createSimEngine({ profile: prof, trajectoryCache: cache });

// Tick every 1 second for first 60 seconds, print HO events
for (let t = 0; t <= 120; t += 1) {
  const snap = eng.tick(t, t);
  const ue = snap.ues[0];
  const serving = ue?.servingSatId ?? 'null';
  const sinr = ue?.servingSinrDb;
  
  // Find best candidate elevation
  const visible = snap.satellites.filter(s => s.isVisible && s.elevationDeg >= 10);
  const best = visible.sort((a,b) => b.elevationDeg - a.elevationDeg)[0];
  
  if (t <= 10 || t % 10 === 0 || serving === 'null') {
    console.log(`t=${t}: serving=${serving} sinr=${sinr?.toFixed(1) ?? 'N/A'} bestVisible=${best?.id}@${best?.elevationDeg.toFixed(1)}°`);
  }
}
