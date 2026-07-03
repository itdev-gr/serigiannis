'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import type { SettingsData } from '@/types/db';

function revalidatePublic() {
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/ekdromes');
}

export async function saveSettings(formData: FormData) {
  const sb = await createServerClient();
  const g = (k: string) => String(formData.get(k) || '').trim();
  const opt = (v: string) => (v ? v : undefined);

  const data: SettingsData = {
    phones: [g('phone1'), g('phone2'), g('phone3')].filter(Boolean),
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

  await sb.from('settings').upsert({ id: 1, data }, { onConflict: 'id' });
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
  await sb.from('tours').update({
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePublic();
}

export async function setFeatured(id: string, is_featured: boolean) {
  const sb = await createServerClient();
  await sb.from('tours').update({ is_featured }).eq('id', id);
  revalidatePublic();
}

export async function deleteTour(id: string) {
  const sb = await createServerClient();
  await sb.from('tours').delete().eq('id', id);
  revalidatePublic();
}

export async function upsertTour(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const slug = String(formData.get('slug') || '').trim();
  const status = String(formData.get('status') || 'draft');
  const payload = {
    title: String(formData.get('title') || '').trim(),
    slug,
    summary: (String(formData.get('summary') || '').trim() || null) as string | null,
    price_from: formData.get('price_from') ? Number(formData.get('price_from')) : null,
    duration_label: (String(formData.get('duration_label') || '').trim() || null) as string | null,
    departure_note: (String(formData.get('departure_note') || '').trim() || null) as string | null,
    status,
    is_featured: formData.get('is_featured') === 'on',
  };

  let tourId = id;
  if (id) {
    await sb.from('tours').update(payload).eq('id', id);
  } else {
    const { data } = await sb.from('tours')
      .insert({ ...payload, published_at: status === 'published' ? new Date().toISOString() : null })
      .select('id').single();
    tourId = data?.id ?? null;
  }
  if (!tourId) return;

  // primary category
  const category = String(formData.get('category') || '');
  if (category) {
    const { data: cat } = await sb.from('categories').select('id').eq('slug', category).maybeSingle();
    if (cat) {
      await sb.from('tour_categories').delete().eq('tour_id', tourId);
      await sb.from('tour_categories').insert({ tour_id: tourId, category_id: cat.id, is_primary: true });
    }
  }

  // optional cover image upload -> Storage
  const file = formData.get('image') as File | null;
  if (file && file.size > 0) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${slug}/cover-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from('tour-images').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: true });
    if (!error) {
      await sb.from('tour_images').delete().eq('tour_id', tourId);
      const { data: img } = await sb.from('tour_images')
        .insert({ tour_id: tourId, storage_path: path, alt_el: payload.title, position: 0 })
        .select('id').single();
      if (img) await sb.from('tours').update({ cover_image_id: img.id }).eq('id', tourId);
    }
  }

  revalidatePublic();
  redirect('/admin/tours');
}

export async function setLeadStatus(id: string, status: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('leads').update({ status }).eq('id', id);
  if (error) console.error('setLeadStatus:', error.message);
  revalidatePath('/admin');
  revalidatePath('/admin/requests');
  revalidatePath('/admin/bookings');
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
  if (!payload.name_el || !payload.slug) return;
  const { error } = id
    ? await sb.from('categories').update(payload).eq('id', id)
    : await sb.from('categories').insert(payload);
  if (error) console.error('upsertCategory:', error.message);
  revalidatePublic();
  revalidatePath('/admin/categories');
}

export async function deleteCategory(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) console.error('deleteCategory:', error.message);
  revalidatePublic();
  revalidatePath('/admin/categories');
}
