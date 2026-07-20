import type { PaymentProvider } from './types';

const API = process.env.VIVA_DEMO === '1' ? 'https://demo-api.vivapayments.com' : 'https://api.vivapayments.com';
const ACCOUNTS = process.env.VIVA_DEMO === '1' ? 'https://demo-accounts.vivapayments.com' : 'https://accounts.vivapayments.com';
const CHECKOUT = process.env.VIVA_DEMO === '1' ? 'https://demo.vivapayments.com/web/checkout' : 'https://www.vivapayments.com/web/checkout';

async function accessToken(): Promise<string> {
  const id = process.env.VIVA_CLIENT_ID;
  const secret = process.env.VIVA_CLIENT_SECRET;
  if (!id || !secret) throw new Error('VIVA_CLIENT_ID / VIVA_CLIENT_SECRET not set');
  const res = await fetch(`${ACCOUNTS}/connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`viva token: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

type VivaTransaction = { statusId: string; orderCode: number; merchantTrns?: string };

async function getTransaction(transactionId: string): Promise<VivaTransaction | null> {
  const token = await accessToken();
  const res = await fetch(`${API}/checkout/v2/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as VivaTransaction;
}

/** Viva Wallet Smart Checkout (Phase 2). merchantTrns carries our order id so
 *  the webhook/return can find the order without extra state. */
export const vivaProvider: PaymentProvider = {
  id: 'viva',

  async createRedirect({ orderId, publicCode, amountCents, email, returnUrl }) {
    const token = await accessToken();
    const res = await fetch(`${API}/checkout/v2/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountCents,
        customerTrns: `Εισιτήρια ${publicCode}`,
        merchantTrns: orderId,
        customer: { email, requestLang: 'el-GR' },
        paymentTimeout: 1800,
        disableCash: true,
        sourceCode: process.env.VIVA_SOURCE_CODE,
        urlFail: returnUrl,
        urlSuccess: returnUrl,
      }),
    });
    if (!res.ok) throw new Error(`viva order: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { orderCode: number };
    return { url: `${CHECKOUT}?ref=${data.orderCode}`, providerRef: String(data.orderCode) };
  },

  async verifyReturn(params) {
    const t = params.get('t'); // transaction id
    if (!t) return { ok: false };
    const trn = await getTransaction(t);
    if (!trn || trn.statusId !== 'F') return { ok: false };
    return { ok: true, orderId: trn.merchantTrns, ref: String(trn.orderCode) };
  },

  async verifyWebhook(req) {
    let body: { EventTypeId?: number; EventData?: { TransactionId?: string } };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return null;
    }
    const transactionId = body.EventData?.TransactionId;
    // 1796 = Transaction Payment Created, 1798 = Transaction Failed
    if (!transactionId || (body.EventTypeId !== 1796 && body.EventTypeId !== 1798)) return null;
    const trn = await getTransaction(transactionId);
    if (!trn?.merchantTrns) return null;
    return {
      eventId: transactionId,
      orderId: trn.merchantTrns,
      ref: String(trn.orderCode),
      kind: trn.statusId === 'F' ? 'paid' : 'failed',
    };
  },

  async refund({ providerRef, amountCents }) {
    // Smart Checkout refunds are keyed by transaction id; the office can also
    // refund from the Viva dashboard. Wired fully in Phase 2.
    console.warn('viva refund requested', providerRef, amountCents);
    return { ok: false };
  },
};
