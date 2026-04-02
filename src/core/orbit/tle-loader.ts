/**
 * TLE / OMM data loader: parse CelesTrak OMM JSON and convert to satellite.js SatRec.
 *
 * Source: CelesTrak OMM JSON format + satellite.js json2satrec
 * Tier: standard-backed (OMM is CCSDS standard; SGP4 is Vallado reference)
 *
 * This file must not import React, Three.js, or scene code.
 */

import { json2satrec } from 'satellite.js';

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
 * Convert OMM records to satellite.js SatRec objects using the library's
 * direct OMM/JSON parser. This preserves the source epoch fields without
 * synthesizing fragile intermediate TLE strings.
 */
export function ommToSatrecs(records: OmmRecord[]): SatrecEntry[] {
  const results: SatrecEntry[] = [];

  for (const r of records) {
    try {
      const satrec = json2satrec({
        ...r,
        EPHEMERIS_TYPE: (r.EPHEMERIS_TYPE ?? 0) as 0,
      } as Parameters<typeof json2satrec>[0]);

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
