export default function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const keyId = process.env.APPLEPAY_KEY_ID;
  const domain = process.env.APPLEPAY_DOMAIN;
  const publicKey = process.env.IQPRO_PUBLIC_API_KEY; 

  if (!keyId || !domain || !publicKey) {
    return res.status(500).json({ error: 'Missing APPLEPAY_KEY_ID / APPLEPAY_DOMAIN / IQPRO_PUBLIC_API_KEY' });
  }
  res.json({ keyId, domain, publicKey });
}