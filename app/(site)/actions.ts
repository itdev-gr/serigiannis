'use server';
import { createServerClient } from '@/lib/supabase/server';
import type { LeadInput } from '@/types/db';

/** Persist a public enquiry. Status is pinned to 'new'; only whitelisted fields are stored. */
export async function createLead(input: LeadInput): Promise<{ ok: boolean; error?: string }> {
  const name = (input.name ?? '').trim();
  if (!name || !['contact', 'quote', 'booking'].includes(input.type)) {
    return { ok: false, error: 'invalid' };
  }
  const row = {
    type: input.type,
    status: 'new' as const,
    name,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    subject: input.subject?.trim() || null,
    message: input.message?.trim() || null,
    tour_id: input.tour_id ?? null,
    preferred_date: input.preferred_date || null,
    party_size: input.party_size ?? null,
    source_path: input.source_path?.slice(0, 200) || null,
  };
  const sb = await createServerClient();
  const { error } = await sb.from('leads').insert(row);
  if (error) { console.error('createLead:', error.message); return { ok: false, error: 'db' }; }
  return { ok: true };
}
