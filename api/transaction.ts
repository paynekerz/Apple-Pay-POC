// api/transaction.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const IQPRO_URL = process.env.IQPRO_API_URL || 'https://sandbox.basysiqpro.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.IQPRO_API_KEY; // e.g. api_2uarb...
    if (!apiKey) return res.status(500).json({ error: 'Missing IQPRO_API_KEY' });

    // Pass through the payload exactly as front-end built it
    const payload = req.body;

    // Quick validations + logs
    console.log('[txn] apple_pay_key_id:', payload?.payment_method?.apple_pay_key_id);
    console.log('[txn] token.version:', payload?.payment_method?.apple_pay_token?.paymentData?.version);
    console.log('[txn] token.header.transactionId:', payload?.payment_method?.apple_pay_token?.paymentData?.header?.transactionId);

    const r = await fetch('https://sandbox.basysiqpro.com/api/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // IQPro sandbox expects API key directly in Authorization (no "Bearer ")
        'Authorization': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await r.json().catch(() => ({}));
    console.log('[txn] BASYS response:', r.status, body);

    res.status(r.status).json(body);
  } catch (e) {
    console.error('[txn] error', e);
    res.status(500).json({ error: 'server error', detail: String(e) });
  }
}
