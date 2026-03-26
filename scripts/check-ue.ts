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

const snap = eng.tick(50, 50);
const ue = snap.ues[0];
console.log('UE:', JSON.stringify(ue, null, 2));
console.log('\nHandover config:', JSON.stringify(prof.handover, null, 2));
