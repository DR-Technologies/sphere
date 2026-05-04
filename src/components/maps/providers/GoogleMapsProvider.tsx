'use client';

import React from 'react';
import { loadGoogleMaps } from './googleMapsLoader';
import type { MapVisualizationProps } from '../types';
import { appLogger, getErrorMessage } from '@/lib/logger';

export default function GoogleMapsProvider({ points }: MapVisualizationProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let mapInstance: any = null;
    let overlays: any[] = [];

    const renderMap = async () => {
      if (!containerRef.current) return;

      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;

        mapInstance = new maps.Map(containerRef.current, {
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#172334' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#c8d6ef' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#172334' }] },
            { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#304764' }] },
            { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1e2d41' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#213248' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26384f' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#223247' }] },
            { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#24364c' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1729' }] }
          ]
        });

        const bounds = new maps.LatLngBounds();
        const infoWindow = new maps.InfoWindow();
        const maxValue = Math.max(...points.map((point) => Math.abs(point.value || 0)), 1);

        points.forEach((point) => {
          const center = { lat: point.lat, lng: point.lon };
          bounds.extend(center);
          const radius = 12000 + (Math.abs(point.value || 0) / maxValue) * 48000;

          const circle = new maps.Circle({
            strokeColor: point.color,
            strokeOpacity: 0.95,
            strokeWeight: 1.5,
            fillColor: point.color,
            fillOpacity: 0.32,
            map: mapInstance,
            center,
            radius
          });

          circle.addListener('mouseover', () => {
            infoWindow.setContent(
              `<div style="padding:6px 8px;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <div style="font-weight:600;margin-bottom:2px;">${String(point.label || '')}</div>
                <div>${Number.isFinite(point.value) ? point.value.toLocaleString() : point.value}</div>
              </div>`
            );
            infoWindow.setPosition(center);
            infoWindow.open({ map: mapInstance });
          });

          circle.addListener('mouseout', () => infoWindow.close());
          overlays.push(circle);
        });

        if (points.length === 1) {
          mapInstance.setCenter({ lat: points[0].lat, lng: points[0].lon });
          mapInstance.setZoom(4);
        } else if (points.length > 1) {
          mapInstance.fitBounds(bounds, 40);
        }
      } catch (err: any) {
        if (!cancelled) {
          appLogger.error('maps', 'GOOGLE_MAP_RENDER_FAILED', 'Failed to load Google Maps provider.', { error: err });
          setError(getErrorMessage(err, 'No se pudo cargar el mapa.'));
        }
      }
    };

    renderMap();

    return () => {
      cancelled = true;
      overlays.forEach((overlay) => {
        if (overlay?.setMap) overlay.setMap(null);
      });
      overlays = [];
      mapInstance = null;
    };
  }, [points]);

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {error}
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '18px', overflow: 'hidden' }} />;
}
