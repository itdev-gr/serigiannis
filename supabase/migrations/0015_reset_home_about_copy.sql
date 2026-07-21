-- Restore homepage About section copy (admin overrides replaced content.ts defaults).
update public.settings
set data = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(data, '{}'::jsonb),
      '{about,eyebrow}',
      '""'::jsonb,
      true
    ),
    '{about,title}',
    '"Ταξιδιωτικό γραφείο στο Περιστέρι από το 1995"'::jsonb,
    true
  ),
  '{about,body}',
  '"Τρεις δεκαετίες μετά, είμαστε ένα από τα πιο αξιόπιστα ταξιδιωτικά γραφεία της Αθήνας. Έχουμε ταξιδέψει χιλιάδες ταξιδιώτες, οικογένειες, σχολεία και επιχειρήσεις σε όλη την Ελλάδα και το εξωτερικό, με αξιοπιστία, ασφάλεια και μεράκι."'::jsonb,
  true
)
where id = 1;
