-- Restore homepage hero titles (admin DB overrides replaced content.ts defaults).
update public.settings
set data = jsonb_set(
  jsonb_set(
    coalesce(data, '{}'::jsonb),
    '{hero,titleTop}',
    '"Μονοήμερες εκδρομές από Αθήνα"'::jsonb,
    true
  ),
  '{hero,titleEmph}',
  '"Sergiani Travel Ταξιδιωτικό Πρακτορείο"'::jsonb,
  true
)
where id = 1;
