import { redirect } from 'next/navigation';
import { POYLMAN_LIST } from '@/lib/admin-routes';

/** (P3) Η λίστα ζει πλέον ως καρτέλα του hub εκδρομών (/admin/tours).
 *  Κρατάμε το ?q= ώστε αποθηκευμένες αναζητήσεις να μη χαθούν. */
export default async function ExcursionsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `${POYLMAN_LIST}&q=${encodeURIComponent(q)}` : POYLMAN_LIST);
}
