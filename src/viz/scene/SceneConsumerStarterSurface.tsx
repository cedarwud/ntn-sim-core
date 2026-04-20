import type { SceneConsumerStarterExport } from './scene-consumer-starter';
import { buildSceneConsumerStarterConsumerProjection } from './scene-consumer-starter-consumer';

export interface SceneConsumerStarterSurfaceProps {
  starter: SceneConsumerStarterExport | null;
  visible?: boolean;
}

export function SceneConsumerStarterSurface({
  starter,
  visible = false,
}: SceneConsumerStarterSurfaceProps) {
  const projection = buildSceneConsumerStarterConsumerProjection(starter);

  if (!visible || !projection) return null;

  return (
    <div
      hidden
      data-testid="scene-consumer-starter"
      {...projection.dataAttributes}
    >
      <div data-testid="scene-consumer-starter-source-line">{projection.sourceLine}</div>
      <div data-testid="scene-consumer-starter-truth-line">{projection.truthLine}</div>
      <div data-testid="scene-consumer-starter-presentation-line">
        {projection.presentationLine}
      </div>
      {projection.serializedStarter}
    </div>
  );
}
