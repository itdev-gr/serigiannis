import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Stepper } from '@/components/ticketing/Stepper';
import { CheckoutForm } from '@/components/ticketing/CheckoutForm';
import { getPaymentProvider } from '@/lib/payments';
import { createServerClient } from '@/lib/supabase/server';
import type { OrderBundle } from '@/types/ticketing';

export const metadata: Metadata = {
  title: 'Ολοκλήρωση Αγοράς',
  robots: { index: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; t?: string }>;
}) {
  const { t } = await searchParams;
  if (!t) redirect('/eisitiria');

  const sb = await createServerClient();
  const { data, error } = await sb.rpc('get_order_by_token', { p_token: t });
  if (error) console.error('checkout bundle:', error.message);
  const bundle = (data ?? { ok: false, error: 'db' }) as OrderBundle;

  if (!bundle.ok) {
    return <Message text="Η κράτηση δεν βρέθηκε." />;
  }
  if (bundle.order.status !== 'pending') {
    if (bundle.tickets.length > 0) redirect(`/eisitiria/epivevaiosi?t=${t}`);
    return (
      <Message text="Η δέσμευση των θέσεων έληξε ή η κράτηση ακυρώθηκε. Ξεκινήστε νέα αναζήτηση." />
    );
  }

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-5xl">
        <Stepper current={4} />
        <CheckoutForm bundle={bundle} token={t} offline={getPaymentProvider().id === 'offline'} />
      </div>
    </section>
  );
}

function Message({ text }: { text: string }) {
  return (
    <section className="py-24">
      <div className="container max-w-2xl text-center">
        <p className="mb-6 text-[16px] text-muted">{text}</p>
        <Link href="/eisitiria" className="font-medium text-primary hover:underline">← Νέα αναζήτηση</Link>
      </div>
    </section>
  );
}
