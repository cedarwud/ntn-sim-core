/**
 * Headless runner types for ntn-sim-core.
 *
 * Governance:
 *   - SDD: sdd/ntn-sim-core-sdd.md §4, §7
 *   - Constraints: sdd/ntn-sim-core-development-constraints.md §4.1, §4.2
 *   - This file must not import React, Three.js, or scene code.
 */

import type { PresentationMode } from '@/core/common/types';
import type { ProfileConfig } from '@/core/profiles/types';
import type { RunArtifactBundle } from '@/core/trace/types';

// ---------------------------------------------------------------------------
// Headless Run Config
// ---------------------------------------------------------------------------

export interface HeadlessRunConfig {
  /** The full profile to simulate. */
  profile: ProfileConfig;
  /** Presentation mode for this run. */
  presentationMode: PresentationMode;
  /** Optional output path for serialized artifacts. */
  outputPath?: string;
  /** Optional overrides applied on top of profile defaults. */
  overrides?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Headless Run Result
// ---------------------------------------------------------------------------

export interface HeadlessRunResult {
  success: boolean;
  /** Populated on success. */
  artifactBundle?: RunArtifactBundle;
  /** Error message on failure. */
  error?: string;
  /** Wall-clock execution time in ms. */
  wallClockMs: number;
}
