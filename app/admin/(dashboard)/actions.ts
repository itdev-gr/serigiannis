'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

function revalidatePublic() {
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/ekdromes');
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
  redirect('/admin');
}
