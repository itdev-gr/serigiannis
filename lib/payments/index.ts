import type { PaymentProvider } from './types';
import { offlineProvider } from './offline';
import { vivaProvider } from './viva';

/** Active gateway, from PAYMENT_PROVIDER env ('offline' default, 'viva'). */
export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    case 'viva':
      return vivaProvider;
    default:
      return offlineProvider;
  }
}

export function getProviderById(id: string): PaymentProvider | null {
  if (id === 'viva') return vivaProvider;
  if (id === 'offline') return offlineProvider;
  return null;
}
