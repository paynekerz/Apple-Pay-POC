// api/transaction.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASYS_URL = 'https://sandbox.basysiqpro.com/api/transaction';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};

    // Accept either legacy top-level appleToken OR the new nested path
    const appleToken =
      body?.payment_method?.applepay?.token ??
      body?.appleToken;

    const type     = body?.type ?? 'sale';
    const amount   = body?.amount;
    const currency = body?.currency ?? 'USD';

    const APPLEPAY_KEY_ID = process.env.APPLEPAY_KEY_ID;
    const IQPRO_API_KEY   = process.env.IQPRO_API_KEY;

    if (!IQPRO_API_KEY) return res.status(500).json({ error: 'Missing IQPRO_API_KEY env' });
    if (!APPLEPAY_KEY_ID) return res.status(400).json({ error: 'Missing APPLEPAY_KEY_ID env' });

    if (!appleToken?.paymentData?.data || !appleToken?.paymentData?.signature) {
      return res.status(400).json({ error: 'Missing Apple Pay token' });
    }
    if (!amount || Number.isNaN(+amount)) {
      return res.status(400).json({ error: 'Missing/invalid amount' });
    }

    const basysBody = {
      type,
      amount,
      currency,
      payment_method: {
        key_id: APPLEPAY_KEY_ID,
        apple_pay_token: {
          pkpaymenttoken: {
            paymentData: {
              data: appleToken.paymentData.data,
              signature: appleToken.paymentData.signature,
              header: {
                publicKeyHash:      appleToken.paymentData.header?.publicKeyHash,
            ephemeralPublicKey: appleToken.paymentData.header?.ephemeralPublicKey,
            transactionId:      appleToken.paymentData.header?.transactionId,
          },
            },
          },
          version: appleToken.paymentData.version,
        },
        paymentMethod: {
          displayName: appleToken.paymentMethod?.displayName ?? null,
          network: appleToken.paymentMethod?.network ?? null,
          type: appleToken.paymentMethod?.type ?? null,
        },
        transactionIdentifier: appleToken.transactionIdentifier ?? null,
      },
    };

    const r = await fetch(BASYS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${IQPRO_API_KEY}`,
      },
      body: JSON.stringify(basysBody),
    });

    const respBody = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : r.status).json(respBody);
  } catch (err: any) {
    console.error('[txn] Unhandled error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err?.message || err) });
  }
}
