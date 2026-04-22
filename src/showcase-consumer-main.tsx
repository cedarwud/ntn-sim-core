import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { ShowcaseConsumerHost } from '@/app/showcase/ShowcaseConsumerHost';
import { SHOWCASE_APP_QUERY_VALUE } from '@/app/showcase/showcase-consumer-window';
import './styles/main.scss';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <StrictMode>
    <ShowcaseConsumerHost appQueryValue={SHOWCASE_APP_QUERY_VALUE} />
  </StrictMode>
);
