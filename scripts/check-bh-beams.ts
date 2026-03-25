import { HOBS_MULTIBEAM_BASELINE } from '../src/core/profiles/defaults';
import { createSimEngine } from '../src/core/engine';
import { buildTrajectoryCache } from '../src/core/orbit/trajectory-cache';
import { generateWalkerConstellation } from '../src/core/orbit/walker';
import type { ProfileConfig } from '../src/core/profiles/types';

const profile = HOBS_MULTIBEAM_BASELINE as unknown as ProfileConfig;
const elements = generateWalkerConstellation({
  shells: [{
    id: 'hobs-shell',
    altitudeKm: profile.orbital.altitude_km,
    inclinationDeg: profile.orbital.inclination_deg,
    planes: profile.orbital.num_planes,
    satsPerPlane: profile.orbital.sats_per_plane,
  }],
  epochUtcMs: profile.timeControl.epochUtcMs,
});
const cache = buildTrajectoryCache({
  elements,
  observerLatDeg: profile.observer.latitudeDeg,
  observerLonDeg: profile.observer.longitudeDeg,
  observerAltKm: profile.observer.altitudeM / 1000,
  durationSec: 30,
  stepSec: 1,
  epochUtcMs: profile.timeControl.epochUtcMs,
});
const engine = createSimEngine({ profile, trajectoryCache: cache });

for (let t = 0; t < 15; t++) {
  const snap = engine.tick();
  const ue = snap.ues[0];
  const servingSat = snap.satellites.find(s => s.id === ue?.servingSatId);
  if (servingSat?.beams) {
    const active = servingSat.beams.filter(b => b.isActive);
    const inactive = servingSat.beams.filter(b => !b.isActive);
    const roles = servingSat.beams.reduce((acc, b) => { acc[b.role] = (acc[b.role] || 0) + 1; return acc; }, {} as Record<string, number>);
    console.log(`t=${snap.timeSec}s  total=${servingSat.beams.length}  active=${active.length}  inactive=${inactive.length}  roles=${JSON.stringify(roles)}  activeIds=[${active.map(b => b.beamId.split('-b')[1]).join(',')}]`);
  } else {
    console.log(`t=${snap.timeSec}s  serving=${ue?.servingSatId ?? 'none'}  no beams`);
  }
}
