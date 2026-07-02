import type { Route } from '@/types';

export const routes: Route[] = [
  { id: 'r1', from: 'Αθήνα', to: 'Ακρωτήριο Σούνιο', durationHours: '4–5 ώρες', description: 'Ηλιοβασίλεμα στον Ναό του Ποσειδώνα.' },
  { id: 'r2', from: 'Αθήνα', to: 'Μετέωρα', durationHours: '12–14 ώρες', description: 'Τα μοναστήρια πάνω από τα βράχια.' },
  { id: 'r3', from: 'Αθήνα', to: 'Δελφοί', durationHours: '8–9 ώρες', description: 'Ο αρχαίος ομφαλός της γης.' },
  { id: 'r4', from: 'Αθήνα', to: 'Αρχαία Ολυμπία', durationHours: '10 ώρες', description: 'Γενέτειρα των Ολυμπιακών Αγώνων.' },
  { id: 'r5', from: 'Περιήγηση', to: 'Αθήνας', durationHours: '4–5 ώρες', description: 'City tour με τα σημαντικότερα μνημεία.' },
];
