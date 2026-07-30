import { redirect } from 'next/navigation';

export default function BookingsPage() {
  redirect('/admin/requests?tab=kratiseis');
}
