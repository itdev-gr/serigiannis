import type { TourStatus } from '@/types/db';

export type TourSetupItemId = 'summary' | 'photos' | 'pricing' | 'departures' | 'meeting_points' | 'published';

export type TourSetupItem = {
  id: TourSetupItemId;
  label: string;
  done: boolean;
  hint?: string;
  warning?: boolean;
};

export type TourSetupInput = {
  status: TourStatus;
  bookings_open: boolean;
  summary: string | null;
  imageCount: number;
  tierCount: number;
  futureDepartureCount: number;
  meetingPointCount: number;
};

/** The six things a tour needs before it sells online, in the order a clerk
 *  should fix them. Pure — the admin page supplies plain counts and flags. */
export function setupChecklist(input: TourSetupInput): TourSetupItem[] {
  const hasSummary = Boolean(input.summary && input.summary.trim().length > 0);
  const hasPhotos = input.imageCount >= 1;
  const hasPricing = input.tierCount >= 1;
  const hasDepartures = input.futureDepartureCount >= 1;
  const isPublished = input.status === 'published';

  return [
    {
      id: 'summary',
      label: 'Περιγραφή',
      done: hasSummary,
      hint: hasSummary ? undefined : 'Χωρίς περιγραφή, η σελίδα της εκδρομής δείχνει ένα γενικό κείμενο αντί για δικό της.',
    },
    {
      id: 'photos',
      label: 'Φωτογραφίες',
      done: hasPhotos,
      hint: hasPhotos ? undefined : 'Χωρίς φωτογραφίες η εκδρομή δείχνει άδεια στο site.',
    },
    {
      id: 'pricing',
      label: 'Κατηγορίες τιμών',
      done: hasPricing,
      hint: hasPricing ? undefined : 'Χωρίς τιμές, η σελίδα δείχνει φόρμα αιτήματος αντί για κράτηση.',
    },
    {
      id: 'departures',
      label: 'Ημερομηνίες αναχώρησης',
      done: hasDepartures,
      hint: hasDepartures ? undefined : 'Ο πελάτης θα κάνει κράτηση χωρίς να διαλέξει ημερομηνία.',
    },
    {
      id: 'meeting_points',
      label: 'Σημεία επιβίβασης',
      done: input.meetingPointCount >= 1,
      // Δεν μπλοκάρει την κράτηση — αλλά σε ζωντανή, ανοιχτή εκδρομή χωρίς
      // σημεία ο πελάτης δεν δηλώνει στάση και το γραφείο τη ζητά τηλεφωνικά.
      warning:
        input.meetingPointCount === 0 && input.status === 'published' && input.bookings_open !== false,
      hint:
        input.meetingPointCount >= 1
          ? undefined
          : 'Χωρίς σημεία, ο πελάτης κάνει κράτηση χωρίς να διαλέξει στάση επιβίβασης — το γραφείο θα τη ζητήσει τηλεφωνικά.',
    },
    {
      id: 'published',
      label: 'Δημοσιευμένη',
      done: isPublished,
      warning: isPublished && input.bookings_open === false,
      hint:
        isPublished && input.bookings_open === false
          ? 'Η εκδρομή είναι ορατή στο site αλλά κλειστή για κρατήσεις.'
          : undefined,
    },
  ];
}
