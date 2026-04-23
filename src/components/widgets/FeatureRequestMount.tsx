'use client';

import dynamic from 'next/dynamic';

// Client-only dynamic import: keeps the widget out of initial server HTML so
// it can't bloat the critical payload or run during SSR. Rendered from the
// root layout so it appears on every page (landing, auth, dashboard, admin).
const FeatureRequestWidget = dynamic(() => import('./FeatureRequestWidget'), {
  ssr: false,
  loading: () => null,
});

export default function FeatureRequestMount() {
  return <FeatureRequestWidget />;
}
