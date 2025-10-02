// api/checkout.ts
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const event = req.body;           // Apple Pay authorization event from Tokenizer
    // For PoC, just acknowledge success (matches docs' server example)
    return res.status(200).json({ status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ status: 'fail', error: e?.message || 'Unexpected error' });
  }
}
