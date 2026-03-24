/**
 * UE module barrel export.
 * This file must not import React, Three.js, or scene code.
 */

export { generateUePositions } from './position-generator';
export type { UePosition } from './position-generator';

export { createMobilityUpdater } from './mobility';
export type { MobilityModel, MobilityConfig } from './mobility';
