/**
 * SINR Time-Series Chart Overlay — pure Canvas 2D, zero dependencies.
 *
 * Displays a rolling SINR vs time chart for the primary UE.
 * Features:
 *   - Color-coded SINR line (green/yellow/orange/red by threshold)
 *   - Qout and A4 trigger threshold reference lines
 *   - Vertical markers at handover events
 *   - Mouse crosshair with exact value readout
 *
 * This file must not import Three.js or R3F code.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { SimulationSnapshot } from '@/core/contracts/runtime-v1';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SinrTimeSeriesOverlayProps {
  snapshot: SimulationSnapshot | null;
  visible?: boolean;
  /** Visible time window in seconds. Default 120. */
  windowSec?: number;
  /** Canvas width in pixels. Default 480. */
  width?: number;
  /** Canvas height in pixels. Default 180. */
  height?: number;
  /** Qout threshold in dB. Default -8. */
  qoutDb?: number;
  /** A4 trigger threshold in dB. Default -6. */
  triggerDb?: number;
}

// ---------------------------------------------------------------------------
// Data point
// ---------------------------------------------------------------------------

interface DataPoint {
  timeSec: number;
  sinrDb: number | null;
  servingSatId: string | null;
}

// ---------------------------------------------------------------------------
// SINR color thresholds (shared with BeamInfoOverlay)
// ---------------------------------------------------------------------------

function sinrColor(sinrDb: number): string {
  if (sinrDb >= 20) return '#00ff88';
  if (sinrDb >= 10) return '#aaff00';
  if (sinrDb >= 5) return '#ffaa00';
  return '#ff4444';
}

// ---------------------------------------------------------------------------
// Chart constants
// ---------------------------------------------------------------------------

const PADDING_LEFT = 44;
const PADDING_RIGHT = 12;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 24;
const Y_MIN_DB = -20;
const Y_MAX_DB = 25;
const GRID_Y_STEP = 5; // dB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SinrTimeSeriesOverlay: React.FC<SinrTimeSeriesOverlayProps> = React.memo(({
  snapshot,
  visible = true,
  windowSec = 120,
  width = 480,
  height = 180,
  qoutDb = -8,
  triggerDb = -6,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<DataPoint[]>([]);
  const [mouseX, setMouseX] = useState<number | null>(null);

  // Append data point on each snapshot
  useEffect(() => {
    if (!snapshot) return;
    const primaryUe = snapshot.ues[0] ?? null;
    const point: DataPoint = {
      timeSec: snapshot.timeSec,
      sinrDb: primaryUe?.sinrDb ?? null,
      servingSatId: primaryUe?.servingSatId ?? null,
    };

    const buf = bufferRef.current;
    // Avoid duplicates (same tick)
    if (buf.length > 0 && buf[buf.length - 1].timeSec >= point.timeSec) return;

    buf.push(point);

    // Trim to window
    const minTime = point.timeSec - windowSec;
    while (buf.length > 0 && buf[0].timeSec < minTime) buf.shift();
  }, [snapshot, windowSec]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buf = bufferRef.current;
    const w = width;
    const h = height;
    const plotW = w - PADDING_LEFT - PADDING_RIGHT;
    const plotH = h - PADDING_TOP - PADDING_BOTTOM;

    // Time range
    const latestTime = buf.length > 0 ? buf[buf.length - 1].timeSec : 0;
    const timeMin = latestTime - windowSec;
    const timeMax = latestTime;

    const toX = (t: number) => PADDING_LEFT + ((t - timeMin) / (timeMax - timeMin || 1)) * plotW;
    const toY = (db: number) => PADDING_TOP + ((Y_MAX_DB - db) / (Y_MAX_DB - Y_MIN_DB)) * plotH;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();

    // Grid lines + Y labels
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let db = Y_MIN_DB; db <= Y_MAX_DB; db += GRID_Y_STEP) {
      const y = toY(db);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT, y);
      ctx.lineTo(w - PADDING_RIGHT, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`${db}`, PADDING_LEFT - 4, y);
    }

    // X-axis time labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xLabelStep = windowSec <= 60 ? 10 : windowSec <= 300 ? 30 : 60;
    const firstLabel = Math.ceil(timeMin / xLabelStep) * xLabelStep;
    for (let t = firstLabel; t <= timeMax; t += xLabelStep) {
      const x = toX(t);
      if (x < PADDING_LEFT || x > w - PADDING_RIGHT) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.moveTo(x, PADDING_TOP);
      ctx.lineTo(x, h - PADDING_BOTTOM);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(`${Math.round(t)}s`, x, h - PADDING_BOTTOM + 4);
    }

    // Threshold reference lines
    const drawThreshold = (db: number, color: string, label: string) => {
      const y = toY(db);
      if (y < PADDING_TOP || y > h - PADDING_BOTTOM) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT, y);
      ctx.lineTo(w - PADDING_RIGHT, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = '9px monospace';
      ctx.fillText(label, PADDING_LEFT + 2, y - 2);
    };

    drawThreshold(qoutDb, 'rgba(255,80,80,0.6)', `Qout ${qoutDb} dB`);
    drawThreshold(triggerDb, 'rgba(255,200,60,0.6)', `A4 ${triggerDb} dB`);
    drawThreshold(0, 'rgba(255,255,255,0.15)', '0 dB');

    // Handover markers
    for (let i = 1; i < buf.length; i++) {
      if (buf[i].servingSatId !== buf[i - 1].servingSatId && buf[i - 1].servingSatId !== null) {
        const x = toX(buf[i].timeSec);
        ctx.strokeStyle = 'rgba(0,200,255,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x, PADDING_TOP);
        ctx.lineTo(x, h - PADDING_BOTTOM);
        ctx.stroke();
        ctx.setLineDash([]);

        // HO label
        ctx.fillStyle = 'rgba(0,200,255,0.7)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('HO', x, PADDING_TOP + 2);
      }
    }

    // SINR line (segmented color)
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    for (let i = 1; i < buf.length; i++) {
      const prev = buf[i - 1];
      const curr = buf[i];
      if (prev.sinrDb === null || curr.sinrDb === null) continue;

      const x0 = toX(prev.timeSec);
      const y0 = toY(prev.sinrDb);
      const x1 = toX(curr.timeSec);
      const y1 = toY(curr.sinrDb);

      ctx.strokeStyle = sinrColor(curr.sinrDb);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Current SINR value label (top-right)
    if (buf.length > 0) {
      const last = buf[buf.length - 1];
      if (last.sinrDb !== null) {
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = sinrColor(last.sinrDb);
        ctx.fillText(`${last.sinrDb.toFixed(1)} dB`, w - PADDING_RIGHT - 4, 4);
      }
    }

    // Title
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('SINR (dB)', PADDING_LEFT, 4);

    // Crosshair on mouse hover
    if (mouseX !== null && buf.length > 1) {
      const hoveredTime = timeMin + ((mouseX - PADDING_LEFT) / plotW) * (timeMax - timeMin);
      // Find nearest point
      let closest = buf[0];
      let minDist = Math.abs(buf[0].timeSec - hoveredTime);
      for (let i = 1; i < buf.length; i++) {
        const d = Math.abs(buf[i].timeSec - hoveredTime);
        if (d < minDist) { minDist = d; closest = buf[i]; }
      }

      if (closest.sinrDb !== null) {
        const cx = toX(closest.timeSec);
        const cy = toY(closest.sinrDb);

        // Vertical line
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(cx, PADDING_TOP);
        ctx.lineTo(cx, h - PADDING_BOTTOM);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot
        ctx.fillStyle = sinrColor(closest.sinrDb);
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Tooltip
        const label = `${closest.timeSec.toFixed(0)}s  ${closest.sinrDb.toFixed(1)} dB`;
        ctx.font = '10px monospace';
        const tw = ctx.measureText(label).width + 8;
        const tx = Math.min(cx + 6, w - tw - 4);
        const ty = Math.max(cy - 18, PADDING_TOP);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(tx, ty, tw, 16);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, tx + 4, ty + 3);
      }
    }
  }, [snapshot, visible, windowSec, width, height, qoutDb, triggerDb, mouseX]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x >= PADDING_LEFT && x <= width - PADDING_RIGHT) {
      setMouseX(x);
    } else {
      setMouseX(null);
    }
  }, [width]);

  const handleMouseLeave = useCallback(() => setMouseX(null), []);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 10,
        borderRadius: 6,
        cursor: 'crosshair',
        pointerEvents: 'auto',
      }}
    />
  );
});

SinrTimeSeriesOverlay.displayName = 'SinrTimeSeriesOverlay';

export default SinrTimeSeriesOverlay;
