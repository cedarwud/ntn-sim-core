import type { CSSProperties } from 'react';

import type { SceneConsumerStarterExport } from './scene-consumer-starter';
import { buildSceneConsumerStarterConsumerProjection } from './scene-consumer-starter-consumer';

export interface SceneConsumerStarterPanelProps {
  starter: SceneConsumerStarterExport | null;
  visible?: boolean;
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  top: 108,
  left: 16,
  zIndex: 10,
  width: 'min(360px, calc(100vw - 32px))',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(112, 188, 255, 0.28)',
  background: 'rgba(5, 14, 24, 0.84)',
  boxShadow: '0 18px 44px rgba(0, 0, 0, 0.24)',
  color: '#dce7f2',
  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  fontSize: 12,
  lineHeight: 1.45,
  pointerEvents: 'none',
  backdropFilter: 'blur(8px)',
};

const eyebrowStyle: CSSProperties = {
  color: '#88caff',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
};

const titleStyle: CSSProperties = {
  marginTop: 4,
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 700,
};

const pathStyle: CSSProperties = {
  marginTop: 10,
  padding: '8px 10px',
  borderRadius: 999,
  background: 'rgba(136, 202, 255, 0.08)',
  border: '1px solid rgba(136, 202, 255, 0.16)',
  color: '#f5fbff',
  fontSize: 11,
  overflowWrap: 'anywhere',
};

const lineStackStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  marginTop: 10,
};

const lineStyle: CSSProperties = {
  color: '#bfd0df',
  fontSize: 11,
  overflowWrap: 'anywhere',
};

export function SceneConsumerStarterPanel({
  starter,
  visible = true,
}: SceneConsumerStarterPanelProps) {
  const projection = buildSceneConsumerStarterConsumerProjection(starter);

  if (!visible || !projection) return null;

  return (
    <aside
      style={containerStyle}
      data-testid="scene-consumer-starter-panel"
      {...projection.dataAttributes}
    >
      <div style={eyebrowStyle}>{projection.surfaceId}</div>
      <div style={titleStyle}>{projection.title}</div>
      <div style={pathStyle}>{projection.deterministicPathId}</div>
      <div style={lineStackStyle}>
        <div style={lineStyle}>{projection.sourceLine}</div>
        <div style={lineStyle}>{projection.truthLine}</div>
        <div style={lineStyle}>{projection.presentationLine}</div>
      </div>
    </aside>
  );
}
