import { redirect } from 'next/navigation';

// Legacy schedule-pattern detail — a pattern id is not an excursion id, so send
// to the hub root rather than a specific excursion.
export default function Page() {
  redirect('/admin/excursions');
}
