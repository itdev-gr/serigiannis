import { redirect } from 'next/navigation';

// Legacy schedules — programming now lives in the excursions hub (P2b).
export default function Page() {
  redirect('/admin/excursions');
}
