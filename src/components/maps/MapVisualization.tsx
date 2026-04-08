'use client';

import React from 'react';
import GoogleMapsProvider from './providers/GoogleMapsProvider';
import type { MapProviderName, MapVisualizationProps } from './types';

const providerRegistry: Record<MapProviderName, React.ComponentType<MapVisualizationProps>> = {
  google: GoogleMapsProvider
};

export default function MapVisualization(props: MapVisualizationProps) {
  const providerName = (process.env.NEXT_PUBLIC_MAP_PROVIDER as MapProviderName | undefined) || 'google';
  const Provider = providerRegistry[providerName] || providerRegistry.google;
  return <Provider {...props} />;
}
