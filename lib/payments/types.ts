/** Thin gateway abstraction: Viva Wallet / Piraeus / offline plug in behind it.
 *  Ticket issuance happens ONLY via the confirm_order_paid RPC, which both the
 *  webhook and the return handler funnel into (idempotent). */
export interface PaymentProvider {
  readonly id: string;
  /** Create a hosted-checkout session and return the redirect URL. */
  createRedirect(input: {
    orderId: string;
    publicCode: string;
    amountCents: number;
    email: string;
    returnUrl: string;
    /** What the customer sees on the bank page — defaults to «Εισιτήρια …». */
    description?: string;
  }): Promise<{ url: string; providerRef: string }>;
  /** Verify the browser return (server-side lookup — never trust the query alone).
   *  `amountCents` is what the gateway says was actually charged, when it says so —
   *  the caller compares it with the order total and flags a mismatch. */
  verifyReturn(params: URLSearchParams): Promise<{ ok: boolean; orderId?: string; ref?: string; amountCents?: number | null }>;
  /** Verify + parse a webhook request. Returns null when the event is irrelevant/invalid. */
  verifyWebhook(req: Request): Promise<{
    eventId: string;
    orderId: string;
    ref: string;
    kind: 'paid' | 'failed';
    amountCents?: number | null;
  } | null>;
  refund(input: { providerRef: string; amountCents: number }): Promise<{ ok: boolean; ref?: string }>;
}
