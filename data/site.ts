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
  { id: 'q1', name: 'Μαρία Κ.', city: 'Αθήνα', quote: 'Η εκδρομή στα Μετέωρα ήταν άψογα οργανωμένη. Ο ξεναγός γνώριζε τα πάντα και το πούλμαν άνετο. Θα ξαναταξιδέψουμε μαζί σας.' },
  { id: 'q2', name: 'Γιώργος Π.', city: 'Περιστέρι', quote: 'Πολυήμερη στην Καππαδοκία με τη Sergiani — αξεπέραστη ποιότητα και ξεκάθαρη τιμή, χωρίς κρυφές χρεώσεις.' },
  { id: 'q3', name: 'Ελένη Μ.', city: 'Ομόνοια', quote: 'Κάθε καλοκαίρι πάμε στη Ψάθα με το πούλμαν τους. Καθαρό, στην ώρα του, με χαμογελαστό προσωπικό.' },
];
