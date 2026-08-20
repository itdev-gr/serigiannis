import { describe, it, expect } from 'vitest';
import { derivePaymentMethod, methodLabel, normalizeVivaTransaction, sourceLabel } from '@/lib/payments/viva-report';
import { recentAthensDates } from '@/lib/viva-sync';

describe('derivePaymentMethod', () => {
  it('κάρτα από NET_* bank id (legacy) και από cardNumber (checkout v2)', () => {
    expect(derivePaymentMethod({ BankId: 'NET_VISA' })).toBe('card');
    expect(derivePaymentMethod({ bankId: 'NET_MASTER', cardNumber: '401779XXXXXX3357' })).toBe('card');
  });

  it('IRIS από το bank id, ανεξαρτήτως σχήματος', () => {
    expect(derivePaymentMethod({ BankId: 'IRIS' })).toBe('iris');
    expect(derivePaymentMethod({ bankId: 'DIAS_IRIS' })).toBe('iris');
  });

  it('IRIS κερδίζει ακόμα κι αν υπάρχει wallet/κάρτα πεδίο', () => {
    expect(derivePaymentMethod({ BankId: 'IRIS', DigitalWalletId: 1 })).toBe('iris');
  });

  it('wallet όταν υπάρχει digitalWalletId χωρίς IRIS', () => {
    expect(derivePaymentMethod({ bankId: 'NET_VISA', digitalWalletId: 2 })).toBe('wallet');
  });

  it('other όταν δεν αναγνωρίζεται τίποτα', () => {
    expect(derivePaymentMethod({})).toBe('other');
  });
});

describe('sourceLabel', () => {
  it('χαρτογραφεί τα γνωστά κανάλια του λογαριασμού', () => {
    expect(sourceLabel('WC-0001', 90000000)).toBe('Site');
    expect(sourceLabel('Default', 16486064)).toBe('POS');
    expect(sourceLabel('7498', null)).toBe('Payment Link');
    expect(sourceLabel('1234', null)).toBe('1234');
    expect(sourceLabel(null, null)).toBe('—');
  });
});

describe('methodLabel', () => {
  it('ελληνικές ετικέτες, με το IRIS κεφαλαία', () => {
    expect(methodLabel('iris')).toBe('IRIS');
    expect(methodLabel('card')).toBe('Κάρτα');
  });
});

describe('normalizeVivaTransaction', () => {
  it('διαβάζει το legacy (PascalCase) σχήμα', () => {
    const row = normalizeVivaTransaction({
      TransactionId: '449afb6a-cb07-41f9-b4d4-057a12ab0205',
      InsDate: '2026-08-20T11:39:24.12+03:00',
      StatusId: 'F',
      Amount: 25.0,
      SourceCode: 'Default',
      SourceTerminalId: 16486064,
      BankId: 'NET_VISA',
      TransactionTypeId: 5,
      MerchantTrns: null,
      CustomerTrns: null,
      Order: { OrderCode: 6232116166486064 },
      Payment: { Email: null, FullName: null },
    });
    expect(row).toMatchObject({
      transaction_id: '449afb6a-cb07-41f9-b4d4-057a12ab0205',
      amount_cents: 2500,
      status: 'F',
      source_code: 'Default',
      terminal_id: 16486064,
      payment_method: 'card',
      order_code: '6232116166486064',
    });
  });

  it('διαβάζει το checkout v2 (camelCase) σχήμα', () => {
    const row = normalizeVivaTransaction({
      transactionId: 'ba15ff42-2533-48c6-99e6-899d24f42c94',
      insDate: '2026-08-20T12:17:46.943+03:00',
      statusId: 'F',
      amount: 10.0,
      sourceCode: 'WC-0001',
      bankId: 'NET_VISA',
      cardNumber: '401779XXXXXX3357',
      orderCode: 8841456420072601,
      merchantTrns: 'c30ed7a2-a06d-4168-808f-a1c9e23a3374',
      customerTrns: 'Κράτηση εκδρομής E2GRTR',
      fullName: 'A.E. CHATZIIOANNOU',
      email: 'x@example.com',
    });
    expect(row).toMatchObject({
      transaction_id: 'ba15ff42-2533-48c6-99e6-899d24f42c94',
      amount_cents: 1000,
      source_code: 'WC-0001',
      card_number: '401779XXXXXX3357',
      merchant_trns: 'c30ed7a2-a06d-4168-808f-a1c9e23a3374',
      full_name: 'A.E. CHATZIIOANNOU',
      email: 'x@example.com',
      payment_method: 'card',
    });
  });

  it('null όταν λείπει id ή ώρα — δεν γράφουμε σκουπίδια', () => {
    expect(normalizeVivaTransaction({ StatusId: 'F' })).toBeNull();
    expect(normalizeVivaTransaction({ TransactionId: 'x', StatusId: 'F' })).toBeNull();
  });
});

describe('recentAthensDates', () => {
  it('σήμερα πρώτα, συνεχόμενες μέρες προς τα πίσω', () => {
    const dates = recentAthensDates(3, new Date('2026-08-20T10:00:00Z'));
    expect(dates).toEqual(['2026-08-20', '2026-08-19', '2026-08-18']);
  });

  it('σέβεται την αλλαγή ημέρας στην Αθήνα (23:30 UTC = επόμενη μέρα ώρα Ελλάδας)', () => {
    const dates = recentAthensDates(2, new Date('2026-08-20T22:30:00Z'));
    expect(dates).toEqual(['2026-08-21', '2026-08-20']);
  });
});
