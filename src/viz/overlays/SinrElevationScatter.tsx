/**
 * SINR vs Elevation Scatter Plot Overlay.
 *
 * Accumulates (elevationDeg, sinrDb) pairs from the primary UE's serving
 * satellite over the entire run and renders a scatter plot.
 *
 * Standard paper figure showing the positive correlation between satellite
 * elevation angle and received SINR.
 *
 * This file must not import Three.js or R3F code.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SinrElevationScatterProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  width?: number;   // default 320
  height?: number;  // default 200
  yMin?: number;    // dB, default -20
  yMax?: number;    // dB, default 30
}

// ---------------------------------------------------------------------------
// Chart constants
// ---------------------------------------------------------------------------

const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 22;
const PAD_BOTTOM = 28;
const X_MIN_EL = 0;
const X_MAX_EL = 90;

// ---------------------------------------------------------------------------
// SINR color
// ---------------------------------------------------------------------------

function sinrColor(db: number): string {
  if (db >= 20) return '#00ff88';
  if (db >= 10) return '#aaff00';
  if (db >= 5)  return '#ffaa00';
  return '#ff4444';
}

// ---------------------------------------------------------------------------
// Simple linear regression helpers
// ---------------------------------------------------------------------------

function linearRegression(pts: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = pts.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of pts) { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ---------------------------------------------------------------------------
// Data point
// ---------------------------------------------------------------------------

interface ScatterPoint { elevDeg: number; sinrDb: number }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SinrElevationScatter: React.FC<SinrElevationScatterProps> = React.memo(({
  snapshot,
  visible = true,
  width = 320,
  height = 200,
  yMin = -20,
  yMax = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptsRef = useRef<ScatterPoint[]>([]);
  const [count, setCount] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  // Collect one data point per tick from primary UE's serving satellite
  useEffect(() => {
    if (!snapshot) return;
    const ue = snapshot.ues[0];
    if (!ue || ue.sinrDb === null || !ue.servingSatId) return;
    const sat = snapshot.satellites.find((s) => s.id === ue.servingSatId);
    if (!sat) return;
    ptsRef.current.push({ elevDeg: sat.elevationDeg, sinrDb: ue.sinrDb });
    setCount(ptsRef.current.length);
  }, [snapshot]);

  const handleReset = useCallback(() => {
    ptsRef.current = [];
    setCount(0);
    setResetKey((k) => k + 1);
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = ptsRef.current;
    const w = width;
    const h = height;
    const plotW = w - PAD_LEFT - PAD_RIGHT;
    const plotH = h - PAD_TOP - PAD_BOTTOM;

    const toX = (el: number) => PAD_LEFT + ((el - X_MIN_EL) / (X_MAX_EL - X_MIN_EL)) * plotW;
    const toY = (db: number) => PAD_TOP + ((yMax - db) / (yMax - yMin)) * plotH;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();

    // Y grid + labels
    ctx.font = '10px monospace';
    for (let db = yMin; db <= yMax; db += 10) {
      const y = toY(db);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(w - PAD_RIGHT, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${db}`, PAD_LEFT - 4, y);
    }

    // X grid + labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let el = 0; el <= 90; el += 15) {
      const x = toX(el);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, h - PAD_BOTTOM);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(`${el}°`, x, h - PAD_BOTTOM + 4);
    }

    // Axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Elevation (°)', PAD_LEFT + plotW / 2, h - 2);

    // Title + sample count
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SINR vs Elevation', PAD_LEFT, 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`n=${count}`, w - PAD_RIGHT - 4, 4);

    if (pts.length === 0) return;

    // Scatter dots (draw older points first, newer on top)
    const maxDots = 2000;
    const stride = pts.length > maxDots ? Math.ceil(pts.length / maxDots) : 1;
    for (let i = 0; i < pts.length; i += stride) {
      const { elevDeg, sinrDb } = pts[i];
      const x = toX(elevDeg);
      const y = toY(sinrDb);
      if (x < PAD_LEFT || x > w - PAD_RIGHT || y < PAD_TOP || y > h - PAD_BOTTOM) continue;
      ctx.fillStyle = sinrColor(sinrDb) + '99'; // semi-transparent
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Regression line
    if (pts.length >= 10) {
      const reg = linearRegression(pts.map((p) => ({ x: p.elevDeg, y: p.sinrDb })));
      if (reg) {
        const x0 = PAD_LEFT;
        const x1 = w - PAD_RIGHT;
        const el0 = X_MIN_EL;
        const el1 = X_MAX_EL;
        const y0 = toY(reg.slope * el0 + reg.intercept);
        const y1 = toY(reg.slope * el1 + reg.intercept);

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.setLineDash([]);

        // Slope annotation
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(
          `${reg.slope >= 0 ? '+' : ''}${reg.slope.toFixed(2)} dB/°`,
          PAD_LEFT + 4,
          PAD_TOP + 4,
        );
      }
    }
  }, [snapshot, visible, width, height, yMin, yMax, count, resetKey]);

  if (!visible) return null;

  return (
    <div
      style={{ position: 'absolute', bottom: 432, right: 16, zIndex: 10 }}
      data-testid="sinr-elevation-scatter"
    >
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: 'block', borderRadius: 6 }}
        />
        <button
          onClick={handleReset}
          title="Clear scatter samples"
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
            fontFamily: '"JetBrains Mono","Fira Code","Consolas",monospace',
            cursor: 'pointer',
          }}
        >
          reset
        </button>
      </div>
    </div>
  );
});

SinrElevationScatter.displayName = 'SinrElevationScatter';
export default SinrElevationScatter;
