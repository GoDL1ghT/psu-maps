export interface Marker {
  id: number;
  latitude: number;
  longitude: number;
  createdAt: string;
}

/** Метка вместе с числом привязанных фотографий — для списка и карты. */
export interface MarkerSummary extends Marker {
  imageCount: number;
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
