// api/echo-verify.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    keyId: process.env.APPLEPAY_KEY_ID,   // safe to expose; it’s a key identifier
    domain: process.env.APPLEPAY_DOMAIN
  });
}
