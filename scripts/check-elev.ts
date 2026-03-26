import { generateWalkerConstellation } from '@/core/orbit';
import { buildTrajectoryCache } from '@/core/orbit/trajectory-cache';

const elements = generateWalkerConstellation({
  shells: [{
    id: 'shell-0',
    altitudeKm: 550,
    inclinationDeg: 53,
    planes: 24,
    satsPerPlane: 22,
  }],
  epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
});

const cache = buildTrajectoryCache({
  elements,
  observerLatDeg: 45.5,
  observerLonDeg: -73.6,
  observerAltKm: 0.036,
  durationSec: 3600,
  stepSec: 10,
  epochUtcMs: Date.UTC(2026, 0, 1, 0, 0, 0),
});

const allPasses: { satId: string; peakEl: number; startSec: number }[] = [];
for (const [satId, passes] of cache.passesBySatId.entries()) {
  for (const p of passes) {
    allPasses.push({ satId, peakEl: p.peakElevationDeg, startSec: p.startTimeSec });
  }
}
allPasses.sort((a, b) => b.peakEl - a.peakEl);

console.log('Total satellites:', elements.length);
console.log('Total visible passes (1hr):', allPasses.length);
console.log('\n--- Top 20 passes by peak elevation ---');
for (const p of allPasses.slice(0, 20)) {
  console.log(`${p.satId}: peak=${p.peakEl.toFixed(1)}° at t=${p.startSec}s`);
}

const above70 = allPasses.filter(p => p.peakEl >= 70).length;
const above50 = allPasses.filter(p => p.peakEl >= 50).length;
const above30 = allPasses.filter(p => p.peakEl >= 30).length;
const above10 = allPasses.filter(p => p.peakEl >= 10).length;
console.log('\nPasses >70:', above70, '>50:', above50, '>30:', above30, '>10:', above10);

// Snapshot: how many visible at specific times
for (const t of [0, 300, 600, 900, 1200, 1800, 2700, 3600]) {
  let c30 = 0, c10 = 0;
  for (const [, passes] of cache.passesBySatId.entries()) {
    for (const p of passes) {
      const s = p.samples.find(s => Math.abs(s.timeSec - t) < 6);
      if (s) {
        if (s.elevationDeg >= 30) c30++;
        if (s.elevationDeg >= 10) c10++;
      }
    }
  }
  console.log(`t=${t}s: >10°=${c10} sats, >30°=${c30} sats`);
}
