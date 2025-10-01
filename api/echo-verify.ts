// api/echo-verify.ts
export default function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store'); // avoid stale 304s while you iterate

  const keyId = process.env.APPLEPAY_KEY_ID;
  const domain = process.env.APPLEPAY_DOMAIN;

  if (!keyId || !domain) {
    return res.status(500).json({
      error: 'Missing APPLEPAY_KEY_ID or APPLEPAY_DOMAIN. Check Vercel env vars and redeploy.'
    });
  }

  return res.json({ keyId, domain });
}
