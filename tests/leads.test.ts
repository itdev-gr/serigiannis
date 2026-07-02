import { describe, it, expect } from 'vitest';
import { groupClients } from '@/lib/queries/leads';
import type { Lead } from '@/types/db';

const lead = (o: Partial<Lead>): Lead => ({
  id: 'x', type: 'contact', status: 'new', name: 'Α', email: null, phone: null,
  subject: null, message: null, tour_id: null, preferred_date: null, party_size: null,
  source_path: null, admin_notes: null, created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z', ...o,
});

describe('groupClients', () => {
  it('groups leads by lowercased email', () => {
    const clients = groupClients([
      lead({ id: '1', name: 'Μαρία', email: 'Maria@example.com', created_at: '2026-01-01T00:00:00Z' }),
      lead({ id: '2', name: 'Μαρία Κ', email: 'maria@example.com', created_at: '2026-02-01T00:00:00Z' }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
    expect(clients[0].email).toBe('maria@example.com');
  });

  it('falls back to phone when no email', () => {
    const clients = groupClients([
      lead({ id: '1', email: null, phone: '210 111' }),
      lead({ id: '2', email: null, phone: '210 111' }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
  });

  it('sorts clients by most recent activity first', () => {
    const clients = groupClients([
      lead({ id: 'old', email: 'a@a.gr', created_at: '2026-01-01T00:00:00Z' }),
      lead({ id: 'new', email: 'b@b.gr', created_at: '2026-05-01T00:00:00Z' }),
    ]);
    expect(clients[0].email).toBe('b@b.gr');
  });

  it('ignores leads with neither email nor phone', () => {
    expect(groupClients([lead({ email: null, phone: null })])).toHaveLength(0);
  });
});
