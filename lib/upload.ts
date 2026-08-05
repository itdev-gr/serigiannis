// Κανόνες και καθαροί υπολογισμοί για το ανέβασμα εικόνων στο admin.
// Χωρίς DOM εδώ — το component (ImageUploader) κάνει την πραγματική
// συρρίκνωση με canvas και δανείζεται αυτές τις αποφάσεις.

export const UPLOAD_RULES = {
  /** Τύποι που αποκωδικοποιεί ο browser για συρρίκνωση. */
  types: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** Πάνω από αυτό δεν το πιάνουμε καν — προστατεύει τον browser. */
  maxBytes: 25 * 1024 * 1024,
  /** Μεγάλη πλευρά μετά τη συρρίκνωση. */
  maxEdge: 2400,
  /** Ποιότητα JPEG εξόδου. */
  quality: 0.85,
  /** Συνιστώμενο ελάχιστο πλάτος πηγής. */
  minWidth: 1600,
  /** Ανώτατο μέγεθος ανά αίτημα (παρτίδα) — αρκετά κάτω από το όριο 15MB των Server Actions. */
  maxRequestBytes: 8 * 1024 * 1024,
};

export type UploadCheck = { ok: true } | { ok: false; message: string };

/** Έλεγχος πριν καν διαβαστεί το αρχείο. Το μήνυμα πάει αυτούσιο στην οθόνη. */
export function validateUploadFile(file: { name: string; type: string; size: number }): UploadCheck {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif' || /\.hei[cf]$/i.test(file.name)) {
    return { ok: false, message: 'Οι φωτογραφίες HEIC του iPhone δεν υποστηρίζονται. Στείλτε τη φωτογραφία ως JPG.' };
  }
  if (!(UPLOAD_RULES.types as readonly string[]).includes(type)) {
    return { ok: false, message: 'Δεκτές μόνο εικόνες JPG, PNG ή WebP.' };
  }
  if (file.size > UPLOAD_RULES.maxBytes) {
    return { ok: false, message: `Το αρχείο ξεπερνά τα ${Math.round(UPLOAD_RULES.maxBytes / 1024 / 1024)} MB.` };
  }
  return { ok: true };
}

/** Διαστάσεις μετά τη συρρίκνωση: η μεγάλη πλευρά πέφτει στο `max`, ποτέ μεγέθυνση. */
export function scaledDimensions(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };
  const ratio = max / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/** Χωρίζει τα αρχεία σε παρτίδες που δεν ξεπερνούν το όριο του request.
 *  Διατηρεί τη σειρά εισόδου. Κάθε παρτίδα έχει τουλάχιστον ένα αρχείο,
 *  ακόμα κι όταν αυτό μόνο του ξεπερνά το `maxBytes` — έτσι αναφέρεται
 *  ως αποτυχία στο δικό του αίτημα αντί να αγνοηθεί σιωπηλά. */
export function batchBySize<T extends { size: number }>(files: T[], maxBytes: number): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let currentBytes = 0;

  for (const file of files) {
    if (current.length > 0 && currentBytes + file.size > maxBytes) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) batches.push(current);

  return batches;
}

/** Η οδηγία που διαβάζει ο υπάλληλος πάνω από το κουμπί. */
export function uploadRulesText(): string {
  return `JPG, PNG ή WebP · κατά προτίμηση οριζόντιες, τουλάχιστον ${UPLOAD_RULES.minWidth}px πλάτος · έως ${Math.round(
    UPLOAD_RULES.maxBytes / 1024 / 1024
  )} MB ανά φωτογραφία. Οι μεγάλες φωτογραφίες σμικραίνονται αυτόματα πριν σταλούν.`;
}
