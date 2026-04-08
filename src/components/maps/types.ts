export interface MapPoint {
  id: string;
  label: string;
  value: number;
  lat: number;
  lon: number;
  color: string;
}

export interface MapVisualizationProps {
  points: MapPoint[];
}

export type MapProviderName = 'google';
