-- 0030: highlights και «τι περιλαμβάνεται / δεν περιλαμβάνεται» ανά εκδρομή.
--
-- ΓΙΑΤΙ: η σελίδα /tour/<slug> έδειχνε μόνο σύνοψη και πρακτικά στοιχεία. Ο
-- επισκέπτης δεν έβλεπε πουθενά «τι θα δω» ούτε τι πληρώνει και τι όχι — τα
-- δύο πράγματα που ρωτάει το τηλέφωνο του γραφείου κάθε μέρα και που κρίνουν
-- αν θα κάνει κράτηση. Οι τρεις στήλες τα δίνουν χωρίς νέο πίνακα: το γραφείο
-- τα γράφει στη φόρμα της εκδρομής, μία γραμμή ανά σημείο, ακριβώς όπως ήδη
-- κάνει με τα meeting_points του 0024.
--
-- Ίδιο σχήμα με το tours.meeting_points (text[] not null default '{}') ώστε ο
-- ίδιος parser του admin (parseBoardingPoints: trim, dedupe χωρίς τόνους/πεζά,
-- 120 χαρακτήρες ανά γραμμή, 20 γραμμές) να τα καθαρίζει και τα τρία. Οι 252
-- υπάρχουσες εκδρομές παίρνουν κενό πίνακα και η σελίδα τους δεν αλλάζει:
-- κάθε ενότητα κρύβεται όταν ο πίνακάς της είναι άδειος.
--
-- Καμία αλλαγή σε RLS (οι πολιτικές του 0002 είναι σε επίπεδο πίνακα και
-- καλύπτουν αυτόματα νέες στήλες) και σε RPC (τα finalize_tour_order /
-- get_tour_order_by_token δεν αγγίζουν αυτά τα πεδία).
--
-- Εφαρμογή: ΧΕΙΡΟΚΙΝΗΤΑ στο project lucwtnzdvcpcdcmfxbqp (SQL editor), ΠΡΙΝ
-- το push — αλλιώς το admin σπάει στην αποθήκευση εκδρομής. Ξανατρέξιμο
-- ακίνδυνο (add column if not exists).

alter table public.tours
  add column if not exists highlights text[] not null default '{}',
  add column if not exists included text[] not null default '{}',
  add column if not exists not_included text[] not null default '{}';
