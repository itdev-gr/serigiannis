import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TripList } from '@/components/ticketing/TripList';
import type { TripRow } from '@/types/ticketing';

// TripList uses next/navigation for the day arrows.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams('route=r1&date=2026-08-08'),
}));

const trip = (o: Partial<TripRow> = {}): TripRow => ({
  id: 't1',
  time: '06:11',
  departure_at: '2026-08-08T06:11:00+03:00',
  seats_available: 25,
  double_decker: false,
  departed: false,
  bookable: true,
  ...o,
});

function renderList(trips: TripRow[]) {
  return render(
    <TripList
      kind="oneway"
      outboundLabel="Δοκιμαστική εκδρομή"
      date="2026-08-08"
      outbound={trips}
    />
  );
}

// Βρέθηκε στο ζωντανό site: η γραμμή δρομολογίου ήταν <tr> με σκέτο onClick,
// χωρίς role/tabIndex και χωρίς εστιάσιμο παιδί — με πληκτρολόγιο ή screen
// reader ήταν αδύνατο να επιλεγεί δρομολόγιο, άρα και να αγοραστεί εισιτήριο.
describe('TripList — επιλογή δρομολογίου με πληκτρολόγιο', () => {
  it('κάθε διαθέσιμο δρομολόγιο είναι radio που παίρνει focus', () => {
    renderList([trip(), trip({ id: 't2', time: '08:30' })]);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    for (const r of radios) {
      expect(r).toHaveAttribute('tabindex', '0');
      expect(r).toHaveAttribute('aria-checked', 'false');
    }
  });

  it('τα δρομολόγια ζουν μέσα σε radiogroup', () => {
    renderList([trip()]);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('το Enter επιλέγει δρομολόγιο', () => {
    renderList([trip()]);
    const row = screen.getByRole('radio');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(row).toHaveAttribute('aria-checked', 'true');
  });

  it('το Space επιλέγει δρομολόγιο', () => {
    renderList([trip()]);
    const row = screen.getByRole('radio');
    fireEvent.keyDown(row, { key: ' ' });
    expect(row).toHaveAttribute('aria-checked', 'true');
  });

  it('το μη διαθέσιμο δρομολόγιο βγαίνει εκτός σειράς Tab και δεν επιλέγεται', () => {
    renderList([trip({ bookable: false, seats_available: 0 })]);
    const row = screen.getByRole('radio');
    expect(row).toHaveAttribute('tabindex', '-1');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(row).toHaveAttribute('aria-checked', 'false');
  });
});
