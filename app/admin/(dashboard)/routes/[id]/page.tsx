import { redirect } from 'next/navigation';

// Legacy route detail — the route id is the excursion id in the hub.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/excursions/${id}`);
}
