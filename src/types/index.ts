// src/types/index.ts

export type TripCategory =
  | 'monoimeri'
  | 'kroyaziera'
  | 'polyimeri'
  | 'thalassia-bania'
  | 'pezoporia';

export type Trip = {
  id: string;
  slug: string;
  title: string;
  category: TripCategory;
  photo: string;
  photoAlt: string;
  priceFrom: number;
  priceOriginal?: number;
  duration: string;
  dates: string;
  description: string;
  featured?: boolean;
};

export type Cruise = {
  id: string;
  slug: string;
  title: string;
  routeTag: string;
  islands: string[];
  photo: string;
  photoAlt: string;
  priceFrom: number;
  duration: string;
  dates: string;
  description: string;
};

export type Route = {
  id: string;
  from: string;
  to: string;
  durationHours: string;
  description: string;
  icon?: string;
};

export type UseCase = {
  id: string;
  icon: string; // Lucide icon name
  title: string;
  description: string;
};

export type Testimonial = {
  id: string;
  name: string;
  city: string;
  quote: string;
};

export type Stat = {
  id: string;
  value: number;
  suffix?: string;
  label: string;
};
