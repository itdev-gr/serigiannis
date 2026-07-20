import type { PaymentProvider } from './types';

/** Phase 1: no online charge. Tickets issue immediately with order status
 *  'offline' («Πληρωμή στο γραφείο») and the office marks them paid. */
export const offlineProvider: PaymentProvider = {
  id: 'offline',
  async createRedirect() {
    throw new Error('offline provider has no redirect');
  },
  async verifyReturn() {
    return { ok: false };
  },
  async verifyWebhook() {
    return null;
  },
  async refund() {
    return { ok: true };
  },
};
