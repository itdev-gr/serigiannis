// Static site content (not tour data). Could move to the `settings` table later.

export type Stat = { id: string; value: number; suffix?: string; label: string };
export type Testimonial = { id: string; name: string; city: string; quote: string };

export const stats: Stat[] = [
  { id: 's1', value: 30, suffix: '+', label: 'Χρόνια Εμπειρίας' },
  { id: 's2', value: 500, suffix: '+', label: 'Εκδρομές τον Χρόνο' },
  { id: 's3', value: 10000, suffix: '+', label: 'Ταξιδιώτες' },
  { id: 's4', value: 50, suffix: '+', label: 'Προορισμοί' },
];

export const testimonials: Testimonial[] = [
  { id: 'q1', name: 'Μαρία Κ.', city: 'Αθήνα', quote: 'Εξαιρετική οργάνωση και φιλικό προσωπικό! Η μονοήμερη στα Μετέωρα ήταν αξέχαστη. Θα ξαναπάμε σίγουρα!' },
  { id: 'q2', name: 'Γιώργος Π.', city: 'Περιστέρι', quote: 'Πολυήμερη εκδρομή στην Καππαδοκία, τέλεια! Τιμές λογικές, ξενοδοχεία πολύ καλά, ο συνοδός άψογος.' },
  { id: 'q3', name: 'Ελένη Μ.', city: 'Ομόνοια', quote: 'Καθημερινά θαλάσσια μπάνια στην Ψάθα, πολύ βολικό για εμάς τους Αθηναίους. Καθαρή θάλασσα, σωστό πρόγραμμα!' },
];
