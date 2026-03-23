/**
 * TLE / OMM data loader: parse CelesTrak OMM JSON and convert to satellite.js SatRec.
 *
 * Source: CelesTrak OMM JSON format + satellite.js twoline2satrec
 * Tier: standard-backed (OMM is CCSDS standard; SGP4 is Vallado reference)
 *
 * This file must not import React, Three.js, or scene code.
 */

import { twoline2satrec } from 'satellite.js';

/** OMM record as found in CelesTrak JSON files. */
export interface OmmRecord {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  NORAD_CAT_ID: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  CLASSIFICATION_TYPE?: string;
  ELEMENT_SET_NO?: number;
  REV_AT_EPOCH?: number;
  EPHEMERIS_TYPE?: number;
}

/** Result of converting an OMM record to a satellite.js SatRec. */
export interface SatrecEntry {
  id: string;
  name: string;
  noradId: number;
  /** satellite.js internal record — typed as `any` to avoid exposing SatRec internals. */
  satrec: any;
}

/**
 * Validate and return OMM records from a parsed JSON array.
 * Filters out records missing required fields.
 */
export function loadOmmRecords(jsonArray: OmmRecord[]): OmmRecord[] {
  return jsonArray.filter(
    (r) =>
      typeof r.NORAD_CAT_ID === 'number' &&
      typeof r.MEAN_MOTION === 'number' &&
      typeof r.ECCENTRICITY === 'number' &&
      typeof r.INCLINATION === 'number' &&
      typeof r.EPOCH === 'string',
  );
}

/**
 * Convert OMM records to satellite.js SatRec objects by constructing TLE line pairs.
 *
 * TLE format reference: https://celestrak.org/columns/v04n03/
 */
export function ommToSatrecs(records: OmmRecord[]): SatrecEntry[] {
  const results: SatrecEntry[] = [];

  for (const r of records) {
    try {
      const line1 = buildTleLine1(r);
      const line2 = buildTleLine2(r);
      const satrec = twoline2satrec(line1, line2);

      if (satrec && !satrec.error) {
        results.push({
          id: `TLE-${r.NORAD_CAT_ID}`,
          name: r.OBJECT_NAME,
          noradId: r.NORAD_CAT_ID,
          satrec,
        });
      }
    } catch {
      // Skip records that fail TLE construction or parsing
    }
  }

  return results;
}

/**
 * Deterministically sample a subset of records for frontend performance.
 * Uses a simple seeded PRNG (xorshift32) for reproducibility.
 */
export function sampleRecords(
  records: OmmRecord[],
  maxCount: number,
  seed: number = 42,
): OmmRecord[] {
  if (records.length <= maxCount) return records;

  // Fisher-Yates shuffle with seeded PRNG
  const indices = Array.from({ length: records.length }, (_, i) => i);
  let s = seed | 0 || 1;
  const xorshift = (): number => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(xorshift() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, maxCount).sort((a, b) => a - b).map((i) => records[i]);
}

// ── TLE line construction helpers ──────────────────────────────────────

/**
 * Parse OMM EPOCH string (ISO 8601) to TLE epoch format: YYDDDdddddddd
 * where YY = 2-digit year, DDD = day of year, dddddddd = fractional day.
 */
function epochToTleFormat(epochStr: string): { yy: string; dayFraction: string } {
  const d = new Date(epochStr);
  const year = d.getUTCFullYear();
  const yy = String(year % 100).padStart(2, '0');

  const startOfYear = Date.UTC(year, 0, 1);
  const dayOfYear = (d.getTime() - startOfYear) / 86400000 + 1; // 1-indexed
  const dayFraction = dayOfYear.toFixed(8).padStart(12, ' ');

  return { yy, dayFraction };
}

/**
 * Format a number in TLE exponential notation: ±NNNNN±E
 * e.g. 0.0001738 → " 17380-3"
 */
function tleExponential(value: number): string {
  if (value === 0) return ' 00000-0';
  const sign = value < 0 ? '-' : ' ';
  const abs = Math.abs(value);
  const exp = Math.floor(Math.log10(abs));
  const mantissa = abs / Math.pow(10, exp);
  const mantStr = Math.round(mantissa * 100000)
    .toString()
    .padStart(5, '0')
    .slice(0, 5);
  const expSign = exp >= 0 ? '+' : '-';
  const expStr = Math.abs(exp).toString();
  return `${sign}${mantStr}${expSign}${expStr}`;
}

/** Compute TLE checksum (mod 10 of digit sum, '-' counts as 1). */
function tleChecksum(line: string): number {
  let sum = 0;
  for (let i = 0; i < 68; i++) {
    const ch = line[i];
    if (ch >= '0' && ch <= '9') sum += Number(ch);
    else if (ch === '-') sum += 1;
  }
  return sum % 10;
}

/** Build TLE Line 1 from OMM record. */
function buildTleLine1(r: OmmRecord): string {
  const norad = String(r.NORAD_CAT_ID).padStart(5, '0');
  const classification = r.CLASSIFICATION_TYPE || 'U';
  // International designator from OBJECT_ID: "2019-074B" → "19074B  "
  const intlParts = r.OBJECT_ID.split('-');
  const intlYear = intlParts[0]?.slice(2) || '00';
  const intlLaunch = (intlParts[1] || '000').padStart(3, '0');
  const intlPiece = (intlParts.slice(2).join('') || intlParts[1]?.replace(/^\d+/, '') || '').padEnd(3, ' ');
  // Re-parse: OBJECT_ID format is "YYYY-NNNP" where P is piece
  const intlDesignator = `${intlYear}${intlLaunch}${intlPiece}`.slice(0, 8).padEnd(8, ' ');

  const { yy, dayFraction } = epochToTleFormat(r.EPOCH);
  const epochField = `${yy}${dayFraction}`.padEnd(14, ' ');

  // Mean motion dot (first derivative / 2) — TLE format: ±.NNNNNNNN
  const nDot = r.MEAN_MOTION_DOT / 2;
  const nDotSign = nDot < 0 ? '-' : ' ';
  const nDotStr = `${nDotSign}.${Math.abs(nDot).toFixed(8).split('.')[1]}`;

  const nDDot = tleExponential(r.MEAN_MOTION_DDOT / 6);
  const bstar = tleExponential(r.BSTAR);

  const ephType = String(r.EPHEMERIS_TYPE ?? 0);
  const elSetNo = String(r.ELEMENT_SET_NO ?? 999).padStart(4, ' ');

  // Construct line without checksum (68 chars)
  let line = `1 ${norad}${classification} ${intlDesignator}${epochField}${nDotStr} ${nDDot} ${bstar} ${ephType} ${elSetNo}`;
  // Pad or trim to exactly 68 chars
  line = line.padEnd(68, ' ').slice(0, 68);
  return line + String(tleChecksum(line));
}

/** Build TLE Line 2 from OMM record. */
function buildTleLine2(r: OmmRecord): string {
  const norad = String(r.NORAD_CAT_ID).padStart(5, '0');
  const inc = r.INCLINATION.toFixed(4).padStart(8, ' ');
  const raan = r.RA_OF_ASC_NODE.toFixed(4).padStart(8, ' ');
  // Eccentricity: no leading "0." — just 7 digits
  const ecc = r.ECCENTRICITY.toFixed(7).split('.')[1];
  const argP = r.ARG_OF_PERICENTER.toFixed(4).padStart(8, ' ');
  const ma = r.MEAN_ANOMALY.toFixed(4).padStart(8, ' ');
  const mm = r.MEAN_MOTION.toFixed(8).padStart(11, ' ');
  const rev = String(r.REV_AT_EPOCH ?? 0).padStart(5, ' ');

  let line = `2 ${norad} ${inc} ${raan} ${ecc} ${argP} ${ma} ${mm}${rev}`;
  line = line.padEnd(68, ' ').slice(0, 68);
  return line + String(tleChecksum(line));
}
