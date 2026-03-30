/**
 * SINR CDF Overlay — cumulative distribution function of SINR samples.
 *
 * Collects all SINR samples across the run and renders an empirical CDF.
 * Standard paper figure: X = SINR (dB), Y = P(SINR ≤ x).
 *
 * Features:
 *   - Color gradient matching SINR quality thresholds
 *   - Percentile markers (5th, 50th, 95th)
 *   - Sample count display
 *   - Reset button to clear accumulated samples
 *
 * This file must not import Three.js or R3F code.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SinrCdfOverlayProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  /** Canvas width px. Default 480. */
  width?: number;
  /** Canvas height px. Default 200. */
  height?: number;
  /** X-axis min (dB). Default -20. */
  xMin?: number;
  /** X-axis max (dB). Default 30. */
  xMax?: number;
}

// ---------------------------------------------------------------------------
// Chart constants
// ---------------------------------------------------------------------------

const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 22;
const PAD_BOTTOM = 28;

// ---------------------------------------------------------------------------
// SINR color thresholds
// ---------------------------------------------------------------------------

function sinrColor(sinrDb: number): string {
  if (sinrDb >= 20) return '#00ff88';
  if (sinrDb >= 10) return '#aaff00';
  if (sinrDb >= 5)  return '#ffaa00';
  return '#ff4444';
}

// ---------------------------------------------------------------------------
// CDF computation
// ---------------------------------------------------------------------------

function computeCdf(samples: Float32Array, xMin: number, xMax: number, steps: number): { x: number; y: number }[] {
  if (samples.length === 0) return [];
  const sorted = Float32Array.from(samples).sort();
  const n = sorted.length;
  const points: { x: number; y: number }[] = [];
  const step = (xMax - xMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * step;
    // Binary search: count samples ≤ x
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] <= x) lo = mid + 1; else hi = mid;
    }
    points.push({ x, y: lo / n });
  }
  return points;
}

function percentile(sorted: Float32Array, p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.floor(p * sorted.length), sorted.length - 1);
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SinrCdfOverlay: React.FC<SinrCdfOverlayProps> = React.memo(({
  snapshot,
  visible = true,
  width = 480,
  height = 200,
  xMin = -20,
  xMax = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<number[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  // Collect SINR sample from each snapshot
  useEffect(() => {
    if (!snapshot) return;
    for (const ue of snapshot.ues) {
      if (ue.sinrDb !== null) {
        samplesRef.current.push(ue.sinrDb);
      }
    }
    // Also collect primary UE if snapshot has ues[0]
    // (already covered above)
    setSampleCount(samplesRef.current.length);
  }, [snapshot]);

  const handleReset = useCallback(() => {
    samplesRef.current = [];
    setSampleCount(0);
    setResetKey((k) => k + 1);
  }, []);

  // Draw CDF
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = width;
    const h = height;
    const plotW = w - PAD_LEFT - PAD_RIGHT;
    const plotH = h - PAD_TOP - PAD_BOTTOM;

    const toX = (db: number) => PAD_LEFT + ((db - xMin) / (xMax - xMin)) * plotW;
    const toY = (p: number) => PAD_TOP + (1 - p) * plotH;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();

    // Grid lines (Y: 0, 0.25, 0.5, 0.75, 1.0)
    ctx.font = '10px monospace';
    for (const p of [0, 0.25, 0.5, 0.75, 1.0]) {
      const y = toY(p);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(w - PAD_RIGHT, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(p * 100)}%`, PAD_LEFT - 4, y);
    }

    // X-axis labels
    const xStep = (xMax - xMin) <= 30 ? 5 : 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let db = Math.ceil(xMin / xStep) * xStep; db <= xMax; db += xStep) {
      const x = toX(db);
      if (x < PAD_LEFT || x > w - PAD_RIGHT) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, h - PAD_BOTTOM);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(`${db}`, x, h - PAD_BOTTOM + 4);
    }

    // X-axis label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '9px monospace';
    ctx.fillText('SINR (dB)', PAD_LEFT + plotW / 2, h - 2);

    // Title + sample count
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SINR CDF', PAD_LEFT, 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`n=${sampleCount}`, w - PAD_RIGHT - 4, 4);

    if (samplesRef.current.length < 2) return;

    // CDF curve — segmented by SINR color
    const cdfPoints = computeCdf(
      Float32Array.from(samplesRef.current),
      xMin, xMax, 300,
    );

    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    for (let i = 1; i < cdfPoints.length; i++) {
      const prev = cdfPoints[i - 1];
      const curr = cdfPoints[i];
      ctx.strokeStyle = sinrColor(curr.x);
      ctx.beginPath();
      ctx.moveTo(toX(prev.x), toY(prev.y));
      ctx.lineTo(toX(curr.x), toY(curr.y));
      ctx.stroke();
    }

    // Percentile markers (5th, 50th, 95th)
    const sorted = Float32Array.from(samplesRef.current).sort();
    const p5 = percentile(sorted, 0.05);
    const p50 = percentile(sorted, 0.50);
    const p95 = percentile(sorted, 0.95);

    const drawPercentileMarker = (db: number, label: string, pValue: number) => {
      const x = toX(db);
      const y = toY(pValue);
      if (x < PAD_LEFT || x > w - PAD_RIGHT) return;

      // Vertical dashed line
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, h - PAD_BOTTOM);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dot on curve
      ctx.fillStyle = sinrColor(db);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label above or below
      ctx.font = '9px monospace';
      ctx.textAlign = db < (xMin + xMax) / 2 ? 'left' : 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = sinrColor(db);
      const lx = ctx.textAlign === 'left' ? x + 3 : x - 3;
      ctx.fillText(`${label} ${db.toFixed(1)}dB`, lx, y - 4);
    };

    drawPercentileMarker(p5, 'P5', 0.05);
    drawPercentileMarker(p50, 'P50', 0.50);
    drawPercentileMarker(p95, 'P95', 0.95);

  }, [snapshot, visible, width, height, xMin, xMax, sampleCount, resetKey]);

  if (!visible) return null;

  return (
    <div style={{ position: 'absolute', bottom: 216, right: 16, zIndex: 10 }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: 'block', borderRadius: 6 }}
        />
        <button
          onClick={handleReset}
          title="Clear CDF samples"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: 'rgba(40,40,60,0.85)',
            color: '#888',
            border: '1px solid #444',
            borderRadius: 3,
            padding: '1px 6px',
            fontSize: 10,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          reset
        </button>
      </div>
    </div>
  );
});

SinrCdfOverlay.displayName = 'SinrCdfOverlay';
export default SinrCdfOverlay;
