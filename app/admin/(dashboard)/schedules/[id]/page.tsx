import { POYLMAN_LIST } from '@/lib/admin-routes';
import { redirect } from 'next/navigation';

// Legacy schedule-pattern detail — a pattern id is not an excursion id, so send
// to the hub root rather than a specific excursion.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await params;
  redirect(POYLMAN_LIST);
}
