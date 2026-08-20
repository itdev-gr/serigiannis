// Ανάγνωση ΟΛΩΝ των συναλλαγών του λογαριασμού Viva — όχι μόνο όσων ξεκίνησε
// το site. Το γραφείο χρεώνει και από POS (source «Default») και με payment
// links (source «7498»)· το legacy Transactions API είναι το μόνο που τις
// επιστρέφει όλες μαζί, με Basic auth Merchant ID + API Key.
import { centsFromMajorUnits } from './amount';

const LEGACY_API = process.env.VIVA_DEMO === '1' ? 'https://demo.vivapayments.com' : 'https://www.vivapayments.com';

/** Κοινή μορφή συναλλαγής όπως τη γράφουμε στη viva_transactions. */
export type VivaTransactionRow = {
  transaction_id: string;
  order_code: string | null;
  amount_cents: number;
  status: string;
  source_code: string | null;
  terminal_id: number | null;
  bank_id: string | null;
  card_number: string | null;
  transaction_type_id: number | null;
  payment_method: string;
  customer_trns: string | null;
  merchant_trns: string | null;
  full_name: string | null;
  email: string | null;
  occurred_at: string;
  raw: Record<string, unknown>;
};

/** Το legacy API μιλά PascalCase, το checkout v2 camelCase — διαβάζουμε και τα
 *  δύο ώστε webhook (v2) και reconciliation (legacy) να μοιράζονται έναν κώδικα. */
function pick<T>(raw: Record<string, unknown>, ...keys: string[]): T | null {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return null;
}

/** card | iris | wallet | other. Το IRIS είναι το κρίσιμο για το γραφείο: δεν
 *  είναι κάρτα, δεν έχει chargeback, και εκκαθαρίζεται αλλιώς. Κρατάμε το raw
 *  ώστε αν η Viva το κωδικοποιεί διαφορετικά απ' ό,τι περιμένουμε, να
 *  διορθωθεί το mapping αναδρομικά. */
export function derivePaymentMethod(raw: Record<string, unknown>): string {
  const bank = (pick<string>(raw, 'BankId', 'bankId') ?? '').toUpperCase();
  const trnsText = `${pick<string>(raw, 'CustomerTrns', 'customerTrns') ?? ''}`.toUpperCase();
  if (bank.includes('IRIS') || bank.includes('DIAS') || trnsText.includes('IRIS ΠΛΗΡΩΜΗ')) return 'iris';
  const wallet = pick<number>(raw, 'DigitalWalletId', 'digitalWalletId');
  if (wallet != null && wallet !== 0) return 'wallet';
  const card = pick<string>(raw, 'cardNumber');
  const legacyCard = pick<Record<string, unknown>>(raw, 'CreditCard');
  if (bank.startsWith('NET_') || bank.includes('VISA') || bank.includes('MASTER') || bank.includes('AMEX') || bank.includes('MAESTRO') || card || legacyCard) {
    return 'card';
  }
  return 'other';
}

/** Ετικέτα καναλιού για το admin: από πού μπήκε η χρέωση. */
export function sourceLabel(sourceCode: string | null, terminalId: number | null): string {
  if (sourceCode === 'WC-0001') return 'Site';
  if (sourceCode === 'Default' && terminalId != null) return 'POS';
  if (sourceCode === 'Default') return 'Viva';
  if (sourceCode === '7498') return 'Payment Link';
  return sourceCode ?? '—';
}

const METHOD_LABEL: Record<string, string> = {
  iris: 'IRIS',
  card: 'Κάρτα',
  wallet: 'Wallet',
  other: 'Άλλο',
};
export function methodLabel(method: string): string {
  return METHOD_LABEL[method] ?? method;
}

/** Τελευταία 4 ψηφία κάρτας, από όποιο σχήμα υπάρχει («401779XXXXXX3357»). */
function cardNumberOf(raw: Record<string, unknown>): string | null {
  const v2 = pick<string>(raw, 'cardNumber');
  if (v2) return v2;
  const cc = pick<Record<string, unknown>>(raw, 'CreditCard');
  const n = cc ? (cc['Number'] as string | undefined) : undefined;
  return n ?? null;
}

/** Κανονικοποίηση μιας συναλλαγής (legacy ή checkout v2) σε γραμμή πίνακα.
 *  Null όταν λείπει το ελάχιστο αναγκαίο (id/ώρα) — δεν γράφουμε σκουπίδια. */
export function normalizeVivaTransaction(raw: Record<string, unknown>): VivaTransactionRow | null {
  const id = pick<string>(raw, 'TransactionId', 'transactionId');
  const occurred = pick<string>(raw, 'InsDate', 'insDate');
  const status = pick<string>(raw, 'StatusId', 'statusId');
  if (!id || !occurred || !status) return null;

  const order = pick<Record<string, unknown>>(raw, 'Order');
  const orderCode = pick<number | string>(raw, 'orderCode') ?? (order ? (order['OrderCode'] as number | string | undefined) : undefined);
  const payment = pick<Record<string, unknown>>(raw, 'Payment');

  return {
    transaction_id: id,
    order_code: orderCode != null ? String(orderCode) : null,
    amount_cents: centsFromMajorUnits(pick<number>(raw, 'Amount', 'amount')) ?? 0,
    status,
    source_code: pick<string>(raw, 'SourceCode', 'sourceCode'),
    terminal_id: pick<number>(raw, 'SourceTerminalId', 'sourceTerminalId'),
    bank_id: pick<string>(raw, 'BankId', 'bankId'),
    card_number: cardNumberOf(raw),
    transaction_type_id: pick<number>(raw, 'TransactionTypeId', 'transactionTypeId'),
    payment_method: derivePaymentMethod(raw),
    customer_trns: pick<string>(raw, 'CustomerTrns', 'customerTrns'),
    merchant_trns: pick<string>(raw, 'MerchantTrns', 'merchantTrns'),
    full_name: pick<string>(raw, 'fullName') ?? (payment ? ((payment['FullName'] as string | null) ?? null) : null),
    email: pick<string>(raw, 'email') ?? (payment ? ((payment['Email'] as string | null) ?? null) : null),
    occurred_at: occurred,
    raw,
  };
}

function basicAuth(): string {
  const id = process.env.VIVA_MERCHANT_ID;
  const key = process.env.VIVA_API_KEY;
  if (!id || !key) throw new Error('VIVA_MERCHANT_ID / VIVA_API_KEY not set');
  return `Basic ${Buffer.from(`${id}:${key}`).toString('base64')}`;
}

/** Όλες οι συναλλαγές μιας ημέρας (ώρα Ελλάδας), κάθε καναλιού. */
export async function listVivaTransactions(date: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${LEGACY_API}/api/transactions?date=${date}`, {
    headers: { Authorization: basicAuth() },
  });
  if (!res.ok) throw new Error(`viva transactions ${date}: ${res.status}`);
  const data = (await res.json()) as { Transactions?: Record<string, unknown>[] };
  return data.Transactions ?? [];
}

/** Μία συναλλαγή με το id της — fallback του webhook για χρεώσεις POS που δεν
 *  υπάρχουν στο checkout v2 API. */
export async function getVivaTransactionLegacy(transactionId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${LEGACY_API}/api/transactions/${transactionId}`, {
    headers: { Authorization: basicAuth() },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { Transactions?: Record<string, unknown>[] };
  return data.Transactions?.[0] ?? null;
}
