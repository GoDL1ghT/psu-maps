export interface Marker {
  id: number;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface MarkerImage {
  id: number;
  markerId: number;
  uri: string;
  createdAt: string;
}

export type MarkerDetailsParams = {
  id: string;
};

export type Coordinate = Pick<Marker, 'latitude' | 'longitude'>;
