import { ShowcaseConsumerHost } from '@/app/showcase/ShowcaseConsumerHost';
import {
  SHOWCASE_APP_QUERY_VALUE,
  readShowcaseConsumerAppEnabled,
} from '@/app/showcase/showcase-consumer-window';
import { SceneShell } from '@/viz/scene/SceneShell';

export function AppShell() {
  const showcaseConsumerEnabled = readShowcaseConsumerAppEnabled(
    typeof window === 'undefined' ? '' : window.location.search,
  );

  return showcaseConsumerEnabled ? (
    <ShowcaseConsumerHost
      appQueryValue={SHOWCASE_APP_QUERY_VALUE}
    />
  ) : (
    <SceneShell />
  );
}
