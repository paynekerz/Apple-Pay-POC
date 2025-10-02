// api/transaction.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const IQPRO_URL = process.env.IQPRO_API_URL || 'https://sandbox.basysiqpro.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS / preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type = 'sale', amount, currency = 'USD', appleToken } = req.body || {};

    const APPLEPAY_KEY_ID = process.env.APPLEPAY_KEY_ID;   // from IQPro ApplePay "ID"
    const IQPRO_API_KEY   = process.env.IQPRO_API_KEY;     // raw API key string

    // Debug logs you requested
    console.log('[txn] APPLEPAY_KEY_ID:', APPLEPAY_KEY_ID);
    console.log('[txn] token.paymentData:', appleToken?.paymentData);

    if (!IQPRO_API_KEY) return res.status(500).json({ error: 'Missing IQPRO_API_KEY env' });
    if (!APPLEPAY_KEY_ID) return res.status(400).json({ error: 'Missing APPLEPAY_KEY_ID env' });
    if (!appleToken?.paymentData?.data || !appleToken?.paymentData?.signature) {
      return res.status(400).json({ error: 'Missing Apple Pay token' });
    }
    if (!amount || Number.isNaN(+amount)) {
      return res.status(400).json({ error: 'Missing/invalid amount' });
    }

    // Body per BASYS docs (Apple Pay credentials section)
    const basysBody = {
      type,                 // 'sale' or 'authorize'
      amount,               // integer cents
      currency,
      payment_method: {
        apple_pay_token: {
          data:       appleToken.paymentData.data,
          signature:  appleToken.paymentData.signature,
          header: {
            ephemeralPublicKey: appleToken.paymentData.header?.ephemeralPublicKey,
            publicKeyHash:      appleToken.paymentData.header?.publicKeyHash,
            transactionId:      appleToken.paymentData.header?.transactionId,
          },
          version:    appleToken.paymentData.version,
        }
      },
      apple_pay_key_id: APPLEPAY_KEY_ID,
    };

    const r = await fetch(`${IQPRO_URL}/api/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // IQPro uses the raw API key here (no "Bearer ")
        Authorization: IQPRO_API_KEY,
      },
      body: JSON.stringify(basysBody),
    });

    const body = await r.json().catch(() => ({}));
    console.log('[txn] IQPro status:', r.status, 'body:', body);

    return res.status(r.ok ? 200 : r.status).json(body);
  } catch (err: any) {
    console.error('[txn] Unhandled error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err?.message || err) });
  }
}
