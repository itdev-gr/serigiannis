import { redirect } from 'next/navigation';
import { poylmanHref } from '@/lib/admin-routes';

/** (P3) Διατηρεί το ?tab= ώστε ένας παλιός σύνδεσμος «…?tab=programma» να
 *  προσγειώνεται στην ίδια καρτέλα όπως πριν. */
export default async function ExcursionDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  redirect(tab ? `${poylmanHref(id)}?tab=${encodeURIComponent(tab)}` : poylmanHref(id));
}
