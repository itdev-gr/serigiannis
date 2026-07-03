import { isDbConfigured, createServerClient } from '@/lib/supabase/server';
import type { Client, Lead, LeadStatus, LeadType } from '@/types/db';

const SELECT = '*, tour:tours(title)';

type RawLead = Omit<Lead, 'tour_title'> & { tour?: { title: string } | null };

function normalize(row: RawLead): Lead {
  const { tour, ...rest } = row;
  return { ...(rest as Omit<Lead, 'tour_title'>), tour_title: tour?.title ?? null };
}

/** Group leads into clients by lowercased email, falling back to phone. Pure. */
export function groupClients(leads: Lead[]): Client[] {
  const map = new Map<string, Client>();
  for (const l of leads) {
    const key = (l.email && l.email.trim().toLowerCase()) || (l.phone && l.phone.replace(/\s+/g, '')) || '';
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.leads.push(l);
      if (l.created_at > existing.lastActivity) existing.lastActivity = l.created_at;
    } else {
      map.set(key, {
        key, name: l.name, email: l.email ? l.email.trim().toLowerCase() : l.email, phone: l.phone,
        count: 1, lastActivity: l.created_at, leads: [l],
      });
    }
  }
  return [...map.values()].sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));
}

export async function getLeads(filter?: { type?: LeadType; status?: LeadStatus }): Promise<Lead[]> {
  if (!isDbConfigured()) return [];
  const sb = await createServerClient();
  let q = sb.from('leads').select(SELECT).order('created_at', { ascending: false });
  if (filter?.type) q = q.eq('type', filter.type);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) { console.error('getLeads:', error.message); return []; }
  return ((data ?? []) as RawLead[]).map(normalize);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (!isDbConfigured()) return null;
  const sb = await createServerClient();
  const { data, error } = await sb.from('leads').select(SELECT).eq('id', id).maybeSingle();
  if (error) { console.error('getLeadById:', error.message); return null; }
  return data ? normalize(data as RawLead) : null;
}

export async function getClients(): Promise<Client[]> {
  return groupClients(await getLeads());
}

export async function getBookings(): Promise<Lead[]> {
  return getLeads({ status: 'booked' });
}
