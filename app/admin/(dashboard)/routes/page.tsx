import { POYLMAN_LIST } from '@/lib/admin-routes';
import { redirect } from 'next/navigation';

// Legacy route — merged into the excursions hub (P2b). Keep as a redirect stub
// so old bookmarks/links land in the right place.
export default function Page() {
  redirect(POYLMAN_LIST);
}
