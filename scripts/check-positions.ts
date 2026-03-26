import { loadProfile } from '@/core/profiles';
import { generateWalkerConstellation } from '@/core/orbit';
import { buildTrajectoryCache } from '@/core/orbit/trajectory-cache';
import { createSimEngine } from '@/core/engine';

const prof = loadProfile('hobs-multibeam-baseline');
console.log('Observer:', prof.observer.name, prof.observer.latitudeDeg, prof.observer.longitudeDeg);

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

// Check at t=0, 300, 600, 900, 1500, 2900
for (const t of [0, 300, 600, 900, 1500, 2900]) {
  const snap = eng.tick(t, Math.floor(t / prof.timeControl.stepSec));
  const visible = snap.satellites.filter(s => s.isVisible);
  const sorted = [...visible].sort((a, b) => b.elevationDeg - a.elevationDeg);
  
  console.log(`\n=== t=${t}s === visible=${visible.length}, serving=${snap.ues[0]?.servingSatId}`);
  console.log('Top 5 by elevation:');
  for (const s of sorted.slice(0, 5)) {
    // Compute 3D position same as projectToSkyDome
    const DEG2RAD = Math.PI / 180;
    const azRad = s.azimuthDeg * DEG2RAD;
    const elRad = s.elevationDeg * DEG2RAD;
    const cosEl = Math.cos(elRad);
    const x = 700 * cosEl * Math.sin(azRad);
    const y = 400 * Math.sin(elRad);
    const z = -700 * cosEl * Math.cos(azRad);
    const dist = Math.sqrt(x*x + z*z); // horizontal distance from center
    console.log(`  ${s.id}: el=${s.elevationDeg.toFixed(1)}° az=${s.azimuthDeg.toFixed(1)}° → 3D(${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)}) hDist=${dist.toFixed(0)}`);
  }
}
