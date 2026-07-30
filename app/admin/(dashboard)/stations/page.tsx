import { redirect } from 'next/navigation';

// Legacy stations — each excursion now owns its destination station (P2b).
export default function Page() {
  redirect('/admin/excursions');
}
