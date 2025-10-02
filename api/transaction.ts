// api/transaction.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASYS_URL = 'https://sandbox.basysiqpro.com/v3/transactions/process';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS / preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      type = 'sale',
      amount,           
      currency = 'USD',
      appleToken,       
    } = req.body || {};

    const APPLEPAY_KEY_ID = process.env.APPLEPAY_KEY_ID;
    const IQPRO_API_KEY   = process.env.IQPRO_API_KEY; 

    // Log what you asked for:
    console.log('[txn] APPLEPAY_KEY_ID:', APPLEPAY_KEY_ID);
    console.log('[txn] token.paymentData:', appleToken?.paymentData);

    if (!IQPRO_API_KEY) {
      return res.status(500).json({ error: 'Missing IQPRO_API_KEY env' });
    }
    if (!APPLEPAY_KEY_ID) {
      return res.status(400).json({ error: 'Missing APPLEPAY_KEY_ID env' });
    }
    if (!appleToken?.paymentData?.data) {
      return res.status(400).json(appleToken.paymentData.data);
    }
    if (!appleToken?.paymentData?.signature) {
      return res.status(400).json({ error: 'Missing Apple Pay signature' });
    }
    if (!amount || Number.isNaN(+amount)) {
      return res.status(400).json({ error: 'Missing/invalid amount' });
    }

    // Shape body exactly as BASYS expects
    const basysBody = {
      type,                       
      amount,                     
      currency,
      payment_method: {
        apple_pay_token: {
          data: appleToken.paymentData.data,
          signature: appleToken.paymentData.signature,
          header: {
            ephemeralPublicKey: appleToken.paymentData.header?.ephemeralPublicKey,
            publicKeyHash:      appleToken.paymentData.header?.publicKeyHash,
            transactionId:      appleToken.paymentData.header?.transactionId,
          },
          version: appleToken.paymentData.version,
        },
      },
      // Per docs: supply your Apple Pay Key Id issued by BASYS / IQPro
      apple_pay_key_id: APPLEPAY_KEY_ID,
      // Optional but often useful:
      metadata: {
        transactionIdentifier: appleToken.transactionIdentifier ?? null,
        paymentNetwork: appleToken.paymentMethod?.network ?? null,
      },
    };

    const r = await fetch(BASYS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // BASYS sandbox key
        Authorization: `Bearer ${IQPRO_API_KEY}`,
      },
      body: JSON.stringify(basysBody),
    });

    const body = await r.json().catch(() => ({}));

    console.log('[txn] BASYS status:', r.status, 'body:', body);

    // Surface BASYS result back to client
    return res.status(r.ok ? 200 : r.status).json(body);
  } catch (err: any) {
    console.error('[txn] Unhandled error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err?.message || err) });
  }
}
