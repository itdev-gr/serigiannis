import { redirect } from 'next/navigation';

export default function ClientsPage() {
  redirect('/admin/requests?tab=pelates');
}
