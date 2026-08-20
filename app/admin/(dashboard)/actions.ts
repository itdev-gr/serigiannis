'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import type { SettingsData } from '@/types/db';
import { resolvePublishedAt } from '@/lib/posts-publish';
import { parseEuroToCents } from '@/lib/booking';
import { parseBoardingPoints, slugifyWithFallback, slugNeedsCleanup } from '@/lib/excursions';
import { flashQuery, withFlash } from '@/lib/admin-flash';

function revalidatePublic() {
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/ekdromes');
  // Οι παρακάτω δείχνουν κι αυτές λίστες εκδρομών αλλά ΔΕΝ έχουν
  // `revalidate`, οπότε χωρίς ρητή ακύρωση έμεναν παγωμένες από το build
  // μέχρι το επόμενο deploy. Το 'page' καλύπτει όλες τις κατηγορίες μαζί.
  revalidatePath('/ekdromes/[category]', 'page');
  revalidatePath('/kroyazieres');
  revalidatePath('/istoriko-ekdromon');
}

/** Admin input for a euro amount stored in a numeric(10,2) column (euros, not
 *  cents): "200" or "200,00" → 200. Empty/unparseable → null. Reuses the
 *  tested comma/dot handling of parseEuroToCents (lib/booking.ts). */
function parseEuroDecimal(raw: string): number | null {
  const cents = parseEuroToCents(raw);
  return cents == null ? null : cents / 100;
}

/** Maps a failed tour insert/update to a specific admin-flash code when the
 *  Postgres error tells us something actionable; otherwise the generic 'db'. */
function tourSaveErrorCode(error: { code?: string } | null | undefined): string {
  if (error?.code === '23505') return 'duplicate_slug'; // unique_violation on slug
  if (error?.code === '22003') return 'invalid_price'; // numeric_value_out_of_range on price_original
  return 'db';
}

export async function saveSettings(formData: FormData) {
  const sb = await createServerClient();
  const g = (k: string) => String(formData.get(k) || '').trim();
  const opt = (v: string) => (v ? v : undefined);

  const data: SettingsData = {
    phones: [g('phone1'), g('phone2'), g('phone3')].filter(Boolean),
    phone24h: opt(g('phone_24h')),
    address: g('address'),
    email: g('email'),
    hours: { weekdays: g('hours_weekdays'), saturday: g('hours_saturday') },
    social: {
      facebook: opt(g('social_facebook')),
      instagram: opt(g('social_instagram')),
      youtube: opt(g('social_youtube')),
    },
    hero: {
      eyebrow: opt(g('hero_eyebrow')),
      titleTop: opt(g('hero_titleTop')),
      titleEmph: opt(g('hero_titleEmph')),
      subtitle: opt(g('hero_subtitle')),
    },
    about: {
      eyebrow: opt(g('about_eyebrow')),
      title: opt(g('about_title')),
      body: opt(g('about_body')),
    },
  };

  const promoEyebrow = opt(g('promo_eyebrow'));
  const promoTitle = opt(g('promo_title'));
  const promoBody = opt(g('promo_body'));
  const promoCta = opt(g('promo_cta'));
  if (promoEyebrow || promoTitle || promoBody || promoCta) {
    data.promo = {
      ...(promoEyebrow ? { eyebrow: promoEyebrow } : {}),
      ...(promoTitle ? { title: promoTitle } : {}),
      ...(promoBody ? { body: promoBody } : {}),
      ...(promoCta ? { cta: promoCta } : {}),
    };
  }

  const stats = [0, 1, 2, 3, 4, 5]
    .map((i) => ({ value: Number(g(`stat_value_${i}`)) || 0, suffix: opt(g(`stat_suffix_${i}`)), label: g(`stat_label_${i}`) }))
    .filter((s) => s.label !== '');
  if (stats.length) data.stats = stats;

  const testimonials = [0, 1, 2, 3]
    .map((i) => ({ name: g(`testi_name_${i}`), city: g(`testi_city_${i}`), quote: g(`testi_quote_${i}`) }))
    .filter((t) => t.name !== '' && t.quote !== '');
  if (testimonials.length) data.testimonials = testimonials;

  const trust = [0, 1, 2, 3]
    .map((i) => ({ title: g(`trust_title_${i}`), text: g(`trust_text_${i}`) }))
    .filter((t) => t.title !== '');
  if (trust.length) data.trust = trust;

  const processEyebrow = opt(g('process_eyebrow'));
  const processTitle = opt(g('process_title'));
  const processSteps = [0, 1, 2]
    .map((i) => ({ title: g(`process_step_title_${i}`), text: g(`process_step_text_${i}`) }))
    .filter((s) => s.title !== '');
  if (processEyebrow || processTitle || processSteps.length) {
    data.process = {
      ...(processEyebrow ? { eyebrow: processEyebrow } : {}),
      ...(processTitle ? { title: processTitle } : {}),
      ...(processSteps.length ? { steps: processSteps } : {}),
    };
  }

  const poylmanValueProps = [0, 1, 2, 3]
    .map((i) => ({ title: g(`poylman_vp_title_${i}`), description: g(`poylman_vp_desc_${i}`) }))
    .filter((v) => v.title !== '');
  const poylmanRoutes = [0, 1, 2]
    .map((i) => ({ from: g(`poylman_route_from_${i}`), to: g(`poylman_route_to_${i}`), hours: g(`poylman_route_hours_${i}`) }))
    .filter((r) => r.from !== '' || r.to !== '');
  if (poylmanValueProps.length || poylmanRoutes.length) {
    data.poylman = {
      ...(poylmanValueProps.length ? { valueProps: poylmanValueProps } : {}),
      ...(poylmanRoutes.length ? { routes: poylmanRoutes } : {}),
    };
  }

  const pageHeroKeys = ['ekdromes', 'kroyazieres', 'poylman', 'epikoinonia', 'istoriko'] as const;
  const pageHeros: Record<string, { eyebrow?: string; title?: string; subtitle?: string }> = {};
  for (const key of pageHeroKeys) {
    const eyebrow = opt(g(`pagehero_${key}_eyebrow`));
    const title = opt(g(`pagehero_${key}_title`));
    const subtitle = opt(g(`pagehero_${key}_subtitle`));
    if (eyebrow || title || subtitle) {
      pageHeros[key] = {
        ...(eyebrow ? { eyebrow } : {}),
        ...(title ? { title } : {}),
        ...(subtitle ? { subtitle } : {}),
      };
    }
  }
  if (Object.keys(pageHeros).length) data.pageHeros = pageHeros;

  const homeSections: NonNullable<SettingsData['homeSections']> = {};
  const destinationsEyebrow = opt(g('homesec_destinations_eyebrow'));
  const destinationsTitle = opt(g('homesec_destinations_title'));
  const destinationsSubtitle = opt(g('homesec_destinations_subtitle'));
  if (destinationsEyebrow || destinationsTitle || destinationsSubtitle) {
    homeSections.destinations = {
      ...(destinationsEyebrow ? { eyebrow: destinationsEyebrow } : {}),
      ...(destinationsTitle ? { title: destinationsTitle } : {}),
      ...(destinationsSubtitle ? { subtitle: destinationsSubtitle } : {}),
    };
  }

  const listingEyebrow = opt(g('homesec_listing_eyebrow'));
  const listingTitle = opt(g('homesec_listing_title'));
  const listingSubtitle = opt(g('homesec_listing_subtitle'));
  if (listingEyebrow || listingTitle || listingSubtitle) {
    homeSections.listing = {
      ...(listingEyebrow ? { eyebrow: listingEyebrow } : {}),
      ...(listingTitle ? { title: listingTitle } : {}),
      ...(listingSubtitle ? { subtitle: listingSubtitle } : {}),
    };
  }

  const testimonialsEyebrow = opt(g('homesec_testimonials_eyebrow'));
  const testimonialsTitle = opt(g('homesec_testimonials_title'));
  if (testimonialsEyebrow || testimonialsTitle) {
    homeSections.testimonials = {
      ...(testimonialsEyebrow ? { eyebrow: testimonialsEyebrow } : {}),
      ...(testimonialsTitle ? { title: testimonialsTitle } : {}),
    };
  }

  const newsEyebrow = opt(g('homesec_news_eyebrow'));
  const newsTitle = opt(g('homesec_news_title'));
  const newsSubtitle = opt(g('homesec_news_subtitle'));
  if (newsEyebrow || newsTitle || newsSubtitle) {
    homeSections.news = {
      ...(newsEyebrow ? { eyebrow: newsEyebrow } : {}),
      ...(newsTitle ? { title: newsTitle } : {}),
      ...(newsSubtitle ? { subtitle: newsSubtitle } : {}),
    };
  }

  const ctaTitle = opt(g('homesec_cta_title'));
  const ctaBody = opt(g('homesec_cta_body'));
  if (ctaTitle || ctaBody) {
    homeSections.cta = {
      ...(ctaTitle ? { title: ctaTitle } : {}),
      ...(ctaBody ? { body: ctaBody } : {}),
    };
  }

  if (Object.keys(homeSections).length) data.homeSections = homeSections;

  const legalTerms = opt(g('legal_terms'));
  const legalPrivacy = opt(g('legal_privacy'));
  if (legalTerms || legalPrivacy) {
    data.legal = {
      ...(legalTerms ? { terms: legalTerms } : {}),
      ...(legalPrivacy ? { privacy: legalPrivacy } : {}),
    };
  }

  const { error } = await sb.from('settings').upsert({ id: 1, data }, { onConflict: 'id' });
  if (error) {
    console.error('saveSettings:', error.message);
    redirect('/admin/settings?error=db');
  }
  // Refresh the footer (root layout) and home copy everywhere.
  revalidatePath('/', 'layout');
  redirect('/admin/settings?saved=1');
}

export async function signOut() {
  const sb = await createServerClient();
  await sb.auth.signOut();
  redirect('/admin/login');
}

export async function setStatus(id: string, status: string) {
  const sb = await createServerClient();
  const { data: tour } = await sb.from('tours').select('slug').eq('id', id).maybeSingle();
  await sb.from('tours').update({
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePublic();
  // Χωρίς αυτό, το «Απόκρυψη» άφηνε τη σελίδα της εκδρομής ζωντανή στο κοινό
  // ως και μία ώρα (revalidate = 3600 στο app/(site)/tour/[slug]/page.tsx).
  if (tour?.slug) revalidatePath(`/tour/${tour.slug}`);
}

export async function setFeatured(id: string, is_featured: boolean) {
  const sb = await createServerClient();
  await sb.from('tours').update({ is_featured }).eq('id', id);
  revalidatePublic();
}

export async function deleteTour(id: string) {
  const sb = await createServerClient();
  const { data: tour } = await sb.from('tours').select('slug').eq('id', id).maybeSingle();
  const { data: images } = await sb.from('tour_images').select('storage_path').eq('tour_id', id);
  const paths = (images ?? []).map((i) => i.storage_path).filter(Boolean);

  // Row delete first, verified via .select('id'): under RLS a denied DELETE
  // returns success with zero rows and no error, so we must check a row
  // actually came back before touching storage — otherwise a denied delete
  // would leave the tour live with its gallery already destroyed.
  const { data: deletedRows, error } = await sb.from('tours').delete().eq('id', id).select('id');
  if (error || !deletedRows || deletedRows.length === 0) {
    console.error('deleteTour:', error?.message ?? 'delete returned no rows (RLS denied?)');
    redirect('/admin/tours?error=delete');
  }

  if (paths.length) {
    const { error: storageError } = await sb.storage.from('tour-images').remove(paths);
    if (storageError) console.error('deleteTour storage:', storageError.message);
  }

  revalidatePublic();
  if (tour?.slug) revalidatePath(`/tour/${tour.slug}`);
  redirect('/admin/tours');
}

/** Ενώνει τις τσεκαρισμένες έτοιμες γραμμές (`<field>_preset`, μία τιμή ανά
 *  checkbox) με τις έξτρα γραμμές του textarea (`<field>`) σε ένα text[]. */
function mergePresetLines(formData: FormData, field: string): string[] {
  const preset = formData.getAll(`${field}_preset`).map(String);
  const extra = String(formData.get(field) || '');
  return parseBoardingPoints([...preset, extra].join('\n'));
}

export async function upsertTour(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const title = String(formData.get('title') || '').trim();
  const status = String(formData.get('status') || 'draft');
  // Safety net only: an empty slug gets generated from the title. A non-empty
  // slug is saved exactly as submitted — never silently normalised — since
  // that would rewrite the public URL of an existing tour behind the
  // office's back. The admin form is where deliberate cleanup happens.
  const rawSlug = String(formData.get('slug') || '').trim();
  const slug = rawSlug || slugifyWithFallback(title);

  // Needed after the write to also revalidate the OLD /tour/<slug> if the
  // slug changed — otherwise the tour stays live at its old URL.
  let previousSlug: string | null = null;
  if (id) {
    const { data: existing } = await sb.from('tours').select('slug').eq('id', id).maybeSingle();
    previousSlug = existing?.slug ?? null;
  }

  const payload = {
    title,
    subtitle: (String(formData.get('subtitle') || '').trim() || null) as string | null,
    slug,
    short_description: (String(formData.get('short_description') || '').trim() || null) as string | null,
    summary: (String(formData.get('summary') || '').trim() || null) as string | null,
    price_from: formData.get('price_from') ? Number(formData.get('price_from')) : null,
    price_original: parseEuroDecimal(String(formData.get('price_original') || '')),
    duration_label: (String(formData.get('duration_label') || '').trim() || null) as string | null,
    departure_note: (String(formData.get('departure_note') || '').trim() || null) as string | null,
    meeting_point: (String(formData.get('meeting_point') || '').trim() || null) as string | null,
    // Έτοιμες γραμμές (checkboxes `<πεδίο>_preset`) + έξτρα γραμμές από το
    // textarea, με την υγιεινή του parseBoardingPoints (trim, dedupe χωρίς
    // τόνους/πεζά, 120 χαρακτήρες ανά γραμμή, 20 γραμμές).
    meeting_points: mergePresetLines(formData, 'meeting_points'),
    highlights: parseBoardingPoints(String(formData.get('highlights') || '')),
    included: mergePresetLines(formData, 'included'),
    not_included: mergePresetLines(formData, 'not_included'),
    route_id: (String(formData.get('route_id') || '').trim() || null) as string | null,
    seo_title: (String(formData.get('seo_title') || '').trim() || null) as string | null,
    seo_description: (String(formData.get('seo_description') || '').trim() || null) as string | null,
    sort_order: formData.get('sort_order') ? Number(formData.get('sort_order')) : 0,
    status,
    is_featured: formData.get('is_featured') === 'on',
    bookings_open: formData.get('bookings_closed') !== 'on',
  };

  let tourId = id;
  if (id) {
    const { error } = await sb.from('tours').update(payload).eq('id', id);
    if (error) {
      console.error('upsertTour update:', error.message);
      redirect(`/admin/tours/${id}/edit${flashQuery(false, tourSaveErrorCode(error))}`);
    }
  } else {
    const { data, error } = await sb.from('tours')
      .insert({ ...payload, published_at: status === 'published' ? new Date().toISOString() : null })
      .select('id').single();
    if (error || !data) {
      console.error('upsertTour insert:', error?.message);
      redirect(`/admin/tours/new${flashQuery(false, tourSaveErrorCode(error))}`);
    }
    tourId = data.id;
  }
  if (!tourId) return;

  // Κατηγορίες: η φόρμα στέλνει ένα `category` ανά επιλεγμένο checkbox και το
  // κρυφό `category_sync` ως δείκτη ότι το πεδίο υπήρχε στη φόρμα. Με τον
  // δείκτη ο συγχρονισμός τρέχει πάντα — παλιότερα, αποθήκευση με κανένα
  // checkbox άφηνε την εκδρομή χωρίς καμία κατηγορία, οπότε φαινόταν στις
  // Προτεινόμενες αλλά σε κανένα φίλτρο κατηγορίας του καταλόγου. Φόρμα χωρίς
  // το πεδίο εξακολουθεί να μην πειράζει τις κατηγορίες.
  const slugs = formData.getAll('category').map(String).filter(Boolean);
  if (formData.has('category_sync') && slugs.length === 0) {
    await sb.from('tour_categories').delete().eq('tour_id', tourId);
  } else if (slugs.length > 0) {
    const { data: cats } = await sb.from('categories').select('id, slug').in('slug', slugs);
    if (cats && cats.length > 0) {
      // Κύρια = η πρώτη με τη σειρά που την έστειλε η φόρμα (σειρά καταλόγου).
      const primarySlug = slugs.find((s) => cats.some((c) => c.slug === s));
      await sb.from('tour_categories').delete().eq('tour_id', tourId);
      await sb.from('tour_categories').insert(
        cats.map((c) => ({ tour_id: tourId, category_id: c.id, is_primary: c.slug === primarySlug }))
      );
    }
  }

  revalidatePublic();
  // The tour's own page isn't covered by revalidatePublic() and is cached for
  // up to an hour (revalidate = 3600) — without this a closed-for-bookings
  // tour (or a slug change) keeps serving the stale page/URL.
  if (slug) revalidatePath(`/tour/${slug}`);
  if (previousSlug && previousSlug !== slug) revalidatePath(`/tour/${previousSlug}`);
  // Με σκέτο redirect ο υπάλληλος προσγειωνόταν στη λίστα χωρίς καμία
  // ένδειξη ότι η αποθήκευση πέτυχε — δυσδιάκριτο από απλή πλοήγηση.
  // Νέα εκδρομή: κατευθείαν στη σελίδα επεξεργασίας, όπου συνεχίζει με
  // φωτογραφίες, τιμές και αναχωρήσεις χωρίς να την ξαναψάχνει στη λίστα.
  if (!id) redirect(`/admin/tours/${tourId}/edit${flashQuery(true)}`);
  redirect(`/admin/tours${flashQuery(true)}`);
}

export type UploadResult = { uploaded: number; failed: { name: string; message: string }[] };

export async function addTourImages(tourId: string, formData: FormData): Promise<UploadResult> {
  const sb = await createServerClient();
  const failed: { name: string; message: string }[] = [];
  const { data: tour } = await sb.from('tours').select('slug, cover_image_id').eq('id', tourId).maybeSingle();
  if (!tour) return { uploaded: 0, failed: [{ name: '—', message: 'Η εκδρομή δεν βρέθηκε.' }] };

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  const { data: existing } = await sb.from('tour_images').select('position').eq('tour_id', tourId).order('position', { ascending: false }).limit(1);
  let pos = (existing?.[0]?.position ?? -1) + 1;
  let firstNewId: string | null = null;
  let uploaded = 0;

  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${tour.slug}/gallery-${Date.now()}-${pos}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from('tour-images').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: true });
    if (error) {
      console.error('addTourImages upload:', error.message);
      failed.push({ name: file.name, message: 'Η αποθήκευση απέτυχε. Δοκιμάστε ξανά.' });
      continue;
    }
    const { data: img, error: rowError } = await sb.from('tour_images').insert({ tour_id: tourId, storage_path: path, position: pos }).select('id').single();
    if (rowError || !img) {
      console.error('addTourImages row:', rowError?.message);
      failed.push({ name: file.name, message: 'Η καταχώρηση απέτυχε. Δοκιμάστε ξανά.' });
      continue;
    }
    if (!firstNewId) firstNewId = img.id;
    uploaded++;
    pos++;
  }

  if (!tour.cover_image_id && firstNewId) await sb.from('tours').update({ cover_image_id: firstNewId }).eq('id', tourId);
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
  if (tour.slug) revalidatePath(`/tour/${tour.slug}`);
  return { uploaded, failed };
}

export async function deleteTourImage(imageId: string, tourId: string) {
  const sb = await createServerClient();
  const { data: img } = await sb.from('tour_images').select('storage_path').eq('id', imageId).maybeSingle();
  const { data: tour } = await sb.from('tours').select('cover_image_id, slug').eq('id', tourId).maybeSingle();

  // Ίδιος κανόνας με το deleteTour: υπό RLS μια απορριμμένη DELETE γυρίζει
  // επιτυχία με μηδέν γραμμές, οπότε επιβεβαιώνουμε ότι όντως έφυγε η εγγραφή
  // ΠΡΙΝ σβήσουμε το αρχείο — αλλιώς μένει εικόνα που δείχνει στο πουθενά.
  const { data: deleted, error } = await sb.from('tour_images').delete().eq('id', imageId).select('id');
  if (error || !deleted || deleted.length === 0) {
    console.error('deleteTourImage:', error?.message ?? 'delete returned no rows (RLS denied?)');
    redirect(`/admin/tours/${tourId}/edit${flashQuery(false, 'delete_image')}`);
  }

  if (img?.storage_path) {
    const { error: storageError } = await sb.storage.from('tour-images').remove([img.storage_path]);
    if (storageError) console.error('deleteTourImage storage:', storageError.message);
  }
  if (tour?.cover_image_id === imageId) {
    const { data: next } = await sb.from('tour_images').select('id').eq('tour_id', tourId).order('position').limit(1);
    await sb.from('tours').update({ cover_image_id: next?.[0]?.id ?? null }).eq('id', tourId);
  }
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
  if (tour?.slug) revalidatePath(`/tour/${tour.slug}`);
}

export async function setCoverImage(tourId: string, imageId: string) {
  const sb = await createServerClient();
  const { data: tour } = await sb.from('tours').select('slug').eq('id', tourId).maybeSingle();
  await sb.from('tours').update({ cover_image_id: imageId }).eq('id', tourId);
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
  if (tour?.slug) revalidatePath(`/tour/${tour.slug}`);
}

export async function setLeadStatus(id: string, status: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('leads').update({ status }).eq('id', id);
  if (error) console.error('setLeadStatus:', error.message);
  revalidatePath('/admin');
  revalidatePath('/admin/requests');
  revalidatePath(`/admin/requests/${id}`);
}

export async function saveLeadNotes(id: string, notes: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('leads').update({ admin_notes: notes }).eq('id', id);
  if (error) console.error('saveLeadNotes:', error.message);
  revalidatePath(`/admin/requests/${id}`);
}

export async function deleteLead(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('leads').delete().eq('id', id);
  if (error) console.error('deleteLead:', error.message);
  revalidatePath('/admin/requests');
  redirect('/admin/requests');
}

export async function upsertCategory(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const payload = {
    name_el: String(formData.get('name_el') || '').trim(),
    slug: String(formData.get('slug') || '').trim(),
    sort_order: Number(formData.get('sort_order') || 0),
  };
  if (!payload.name_el || !payload.slug) {
    redirect(withFlash('/admin/tours?tab=katigories', false, 'invalid_input'));
  }
  const { error } = id
    ? await sb.from('categories').update(payload).eq('id', id)
    : await sb.from('categories').insert(payload);
  if (error) console.error('upsertCategory:', error.message);
  revalidatePublic();
  revalidatePath('/admin/tours');
  // Χωρίς redirect+flash, ένα διπλό slug (unique) απλώς ξαναφόρτωνε τη σελίδα
  // με την παλιά τιμή και ο υπάλληλος νόμιζε ότι αποθηκεύτηκε.
  const code = error?.code === '23505' ? 'duplicate_category' : 'db';
  redirect(withFlash('/admin/tours?tab=katigories', !error, code));
}

export async function deleteCategory(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) console.error('deleteCategory:', error.message);
  revalidatePublic();
  revalidatePath('/admin/tours');
  redirect(withFlash('/admin/tours?tab=katigories', !error));
}

// ── Έτοιμα κείμενα φόρμας εκδρομής (tour_presets) ─────────────────────────

const PRESET_KINDS = ['meeting_point', 'included', 'not_included'];

export async function upsertTourPreset(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const payload = {
    kind: String(formData.get('kind') || ''),
    label: String(formData.get('label') || '').trim(),
    sort_order: Number(formData.get('sort_order') || 0),
  };
  if (!payload.label || !PRESET_KINDS.includes(payload.kind)) {
    redirect(withFlash('/admin/tours?tab=keimena', false, 'invalid_input'));
  }
  const { error } = id
    ? await sb.from('tour_presets').update(payload).eq('id', id)
    : await sb.from('tour_presets').insert(payload);
  if (error) console.error('upsertTourPreset:', error.message);
  revalidatePath('/admin/tours');
  const code = error?.code === '23505' ? 'duplicate_preset' : 'db';
  redirect(withFlash('/admin/tours?tab=keimena', !error, code));
}

export async function deleteTourPreset(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('tour_presets').delete().eq('id', id);
  if (error) console.error('deleteTourPreset:', error.message);
  revalidatePath('/admin/tours');
  redirect(withFlash('/admin/tours?tab=keimena', !error));
}

function revalidatePosts(slug?: string) {
  revalidatePath('/admin/posts');
  revalidatePath('/nea');
  if (slug) revalidatePath(`/nea/${slug}`);
}

export async function upsertPost(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  // Στο πεδίο slug έχει μπει και ολόκληρη λίστα λέξεων-κλειδιών με ελληνικά,
  // κόμματα και κενά — ένα τέτοιο slug 215 χαρακτήρων έριξε το build στο
  // Vercel (ENAMETOOLONG στο prerender του /nea/<slug>). Ό,τι δεν είναι ήδη
  // καθαρό URL segment καθαρίζεται εδώ, με εφεδρικό τον τίτλο.
  const rawSlug = String(formData.get('slug') || '').trim();
  const slug =
    rawSlug && !slugNeedsCleanup(rawSlug)
      ? rawSlug
      : slugifyWithFallback(rawSlug || String(formData.get('title') || ''), 'arthro');
  const status = String(formData.get('status') || 'draft');

  let existingPublishedAt: string | null = null;
  let existingLookupFailed = false;
  // Χρειάζεται μετά την εγγραφή για να ανανεωθεί και το ΠΑΛΙΟ /nea/<slug>,
  // αλλιώς το άρθρο μένει ζωντανό και στην παλιά του διεύθυνση.
  let previousPostSlug: string | null = null;
  if (id) {
    const { data: existing, error } = await sb.from('posts').select('published_at, slug').eq('id', id).maybeSingle();
    if (error) {
      console.error('upsertPost select:', error.message);
      existingLookupFailed = true;
    }
    existingPublishedAt = existing?.published_at ?? null;
    previousPostSlug = existing?.slug ?? null;
  }
  const priceRaw = String(formData.get('price') || '').trim();
  const submittedPublishedOn = String(formData.get('published_on') || '').trim();

  const payload = {
    title: String(formData.get('title') || '').trim(),
    slug,
    excerpt: (String(formData.get('excerpt') || '').trim() || null) as string | null,
    body: String(formData.get('body') || '').trim(),
    seo_title: (String(formData.get('seo_title') || '').trim() || null) as string | null,
    seo_description: (String(formData.get('seo_description') || '').trim() || null) as string | null,
    status,
    trip_date: (String(formData.get('trip_date') || '').trim() || null) as string | null,
    price: priceRaw ? Number(priceRaw) : null,
    route_id: (String(formData.get('route_id') || '').trim() || null) as string | null,
    // If the lookup failed, only an explicit form date may touch published_at —
    // otherwise leave the column as-is rather than risk re-dating the post.
    ...(existingLookupFailed && !submittedPublishedOn
      ? {}
      : {
          published_at: resolvePublishedAt({
            status,
            submitted: submittedPublishedOn,
            existing: existingPublishedAt,
          }),
        }),
  };

  // Το posts.slug είναι unique: χωρίς redirect+flash ένα διπλό slug έστελνε
  // τον υπάλληλο πίσω στη λίστα σαν να είχε αποθηκευτεί το άρθρο.
  const postErrorCode = (e: { code?: string } | null) =>
    e?.code === '23505' ? 'duplicate_post_slug' : 'db';
  let postId = id;
  if (id) {
    const { error } = await sb.from('posts').update(payload).eq('id', id);
    if (error) {
      console.error('upsertPost update:', error.message);
      redirect(`/admin/posts/${id}/edit${flashQuery(false, postErrorCode(error))}`);
    }
  } else {
    const { data, error } = await sb.from('posts').insert(payload).select('id').single();
    if (error || !data) {
      console.error('upsertPost insert:', error?.message);
      redirect(`/admin/posts/new${flashQuery(false, postErrorCode(error))}`);
    }
    postId = data.id;
  }
  if (!postId) return;

  const cover = formData.get('cover');
  if (cover instanceof File && cover.size > 0) {
    const ext = (cover.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `posts/${slug}/cover-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const buf = Buffer.from(await cover.arrayBuffer());
    const { error } = await sb.storage.from('tour-images').upload(path, buf, { contentType: cover.type || 'image/jpeg', upsert: true });
    if (error) {
      console.error('upsertPost upload:', error.message);
    } else {
      await sb.from('posts').update({ cover_path: path }).eq('id', postId);
    }
  }

  revalidatePosts(slug);
  // Μετονομασία slug: χωρίς αυτό το άρθρο έμενε ζωντανό και στην παλιά
  // του διεύθυνση για όσο κρατά το cache της /nea/<slug>.
  if (previousPostSlug && previousPostSlug !== slug) revalidatePath(`/nea/${previousPostSlug}`);
  redirect('/admin/posts');
}

export async function setPostStatus(id: string, status: string) {
  const sb = await createServerClient();
  // Το slug χρειάζεται για να ακυρωθεί και η δημόσια σελίδα του άρθρου —
  // αλλιώς ένα κρυμμένο άρθρο έμενε ορατό ως και μία ώρα.
  const { data: existing, error: selError } = await sb.from('posts').select('published_at, slug').eq('id', id).maybeSingle();
  if (selError) console.error('setPostStatus select:', selError.message);
  const patch: { status: string; published_at?: string } = { status };
  if (status === 'published' && !existing?.published_at) {
    patch.published_at = new Date().toISOString();
  }
  const { error } = await sb.from('posts').update(patch).eq('id', id);
  if (error) console.error('setPostStatus:', error.message);
  revalidatePosts(existing?.slug ?? undefined);
}

export async function deletePost(id: string) {
  const sb = await createServerClient();
  // Το slug πρώτα: μετά τη διαγραφή δεν υπάρχει τρόπος να ακυρωθεί η δημόσια
  // σελίδα του άρθρου, που θα συνέχιζε να σερβίρεται ως και μία ώρα.
  const { data: post } = await sb.from('posts').select('slug').eq('id', id).maybeSingle();
  const { error } = await sb.from('posts').delete().eq('id', id);
  if (error) console.error('deletePost:', error.message);
  revalidatePosts(post?.slug ?? undefined);
}

// ── Tour booking setup (price categories + departure dates) ────────────────

type TierPayload = {
  id?: string;
  label?: string;
  price?: string;
  price_original?: string;
  max_qty?: string;
  is_active?: boolean;
};

type DeparturePayload = {
  id?: string;
  starts_on?: string;
  ends_on?: string;
  note?: string;
  capacity?: string;
  is_active?: boolean;
};

function parseJsonRows<T>(raw: FormDataEntryValue | null): T[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Save every price category and departure date of a tour in one shot: rows the
 *  editor dropped are deleted, the rest are upserted in on-screen order. */
export async function saveTourBooking(formData: FormData) {
  const sb = await createServerClient();
  const tourId = String(formData.get('tour_id') || '');
  if (!tourId) return;

  const tiers = parseJsonRows<TierPayload>(formData.get('tiers'))
    .map((t, i) => ({
      id: t.id,
      tour_id: tourId,
      label: String(t.label ?? '').trim(),
      price_cents: parseEuroToCents(t.price ?? '') ?? 0,
      price_original_cents: parseEuroToCents(t.price_original ?? ''),
      max_qty: Math.min(99, Math.max(1, Number(t.max_qty) || 20)),
      position: i,
      is_active: t.is_active !== false,
    }))
    .filter((t) => t.label !== '');

  const departures = parseJsonRows<DeparturePayload>(formData.get('departures'))
    .map((d) => ({
      id: d.id,
      tour_id: tourId,
      starts_on: String(d.starts_on ?? '').trim(),
      ends_on: String(d.ends_on ?? '').trim() || null,
      note: String(d.note ?? '').trim() || null,
      capacity: d.capacity && Number(d.capacity) > 0 ? Number(d.capacity) : null,
      is_active: d.is_active !== false,
    }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.starts_on));

  const keptTierIds = tiers.map((t) => t.id).filter((id): id is string => Boolean(id));
  const keptDepIds = departures.map((d) => d.id).filter((id): id is string => Boolean(id));

  const inList = (ids: string[]) => `("${ids.join('","')}")`;
  const delTiers = sb.from('tour_price_tiers').delete().eq('tour_id', tourId);
  await (keptTierIds.length ? delTiers.not('id', 'in', inList(keptTierIds)) : delTiers);
  const delDeps = sb.from('tour_departures').delete().eq('tour_id', tourId);
  await (keptDepIds.length ? delDeps.not('id', 'in', inList(keptDepIds)) : delDeps);

  for (const t of tiers) {
    const { id, ...values } = t;
    const { error } = id
      ? await sb.from('tour_price_tiers').update(values).eq('id', id).eq('tour_id', tourId)
      : await sb.from('tour_price_tiers').insert(values);
    if (error) console.error('saveTourBooking tier:', error.message);
  }
  for (const d of departures) {
    const { id, ...values } = d;
    const { error } = id
      ? await sb.from('tour_departures').update(values).eq('id', id).eq('tour_id', tourId)
      : await sb.from('tour_departures').insert(values);
    if (error) console.error('saveTourBooking departure:', error.message);
  }

  const { data: tour } = await sb.from('tours').select('slug').eq('id', tourId).maybeSingle();
  if (tour?.slug) revalidatePath(`/tour/${tour.slug}`);
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
}

// ── Tour bookings (orders) ────────────────────────────────────────────────

export async function setTourOrderStatus(id: string, status: string) {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('admin_set_tour_order_status', { p_order_id: id, p_status: status });
  const ok = !error && Boolean((data as { ok?: boolean } | null)?.ok);
  if (!ok) console.error('setTourOrderStatus:', error?.message ?? data);
  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${id}`);
  // Χωρίς flash, μια απορριμμένη αλλαγή κατάστασης έμοιαζε ακριβώς με επιτυχία.
  redirect(`/admin/bookings/${id}${flashQuery(ok)}`);
}

/** Επεξεργασία στοιχείων πελάτη μιας κράτησης εκδρομής — το γραφείο συχνά
 *  διορθώνει τηλέφωνο/όνομα μετά από τηλεφώνημα του πελάτη. */
export async function saveTourOrderContact(id: string, formData: FormData) {
  const clean = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v === '' ? null : v;
  };
  const sb = await createServerClient();
  const { error } = await sb
    .from('tour_orders')
    .update({
      customer_name: clean('customer_name'),
      email: clean('email'),
      phone: clean('phone'),
      meeting_point: clean('meeting_point'),
    })
    .eq('id', id);
  if (error) console.error('saveTourOrderContact:', error.message);
  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${id}`);
  redirect(`/admin/bookings/${id}${flashQuery(!error)}`);
}

export async function saveTourOrderNotes(id: string, notes: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('tour_orders').update({ admin_notes: notes }).eq('id', id);
  if (error) console.error('saveTourOrderNotes:', error.message);
  revalidatePath(`/admin/bookings/${id}`);
}
