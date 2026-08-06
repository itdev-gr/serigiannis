import { NextResponse } from 'next/server';
import { getTours } from '@/lib/queries/tours';
import { suggestTours } from '@/lib/not-found-suggest';

/** Προτάσεις εκδρομών για μια διεύθυνση που δεν βρέθηκε.
 *
 *  Η σελίδα 404 του Next δεν μαθαίνει ποια διεύθυνση ζητήθηκε — δεν παίρνει
 *  params ούτε pathname. Οπότε τη διαβάζει ο browser και τη στέλνει εδώ.
 *  Επιστρέφει το πολύ 4 δημοσιευμένες εκδρομές, μόνο slug και τίτλο. */
export const revalidate = 3600;

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path') ?? '';
  // Φράγμα μεγέθους: η διεύθυνση έρχεται από τον client.
  if (!path || path.length > 300) return NextResponse.json({ suggestions: [] });

  const tours = await getTours();
  const suggestions = suggestTours(
    path,
    tours.map((t) => ({ slug: t.slug, title: t.title })),
    4
  );
  return NextResponse.json({ suggestions });
}
