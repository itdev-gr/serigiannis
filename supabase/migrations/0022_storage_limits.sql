-- 0022: όρια στο bucket των εικόνων. Το UI ήδη ελέγχει και συρρικνώνει, αυτό
-- είναι το δίχτυ για ό,τι φτάσει από αλλού (π.χ. απευθείας κλήση API).
update storage.buckets
   set file_size_limit = 26214400,  -- 25 MB, όσο και το όριο του UI
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'tour-images';
