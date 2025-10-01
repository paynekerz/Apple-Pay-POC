// api/transaction.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type = 'sale', amount = 123, apple_pay_temporary_token } = req.body || {};
    if (!apple_pay_temporary_token) {
      return res.status(400).json({ error: 'Missing apple_pay_temporary_token' });
    }

    const apiUrl = process.env.IQPRO_API_URL!;
    const apiKey = process.env.IQPRO_API_KEY!;
    const body = {
      type,                           // "sale" | "authorize" | "verification" | "credit"
      amount,                         // cents
      payment_method: {
        apple_pay_token: { temporary_token: apple_pay_temporary_token }
      }
    };

    const r = await fetch(`${apiUrl}/api/transaction`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await r.json().catch(() => ({}));
    res.status(r.status).json({
      status: r.ok ? 'ok' : 'error',
      httpStatus: r.status,
      response: data
    });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'Unexpected error' });
  }
}
