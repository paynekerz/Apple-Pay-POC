// Vercel/Node (Edge not required). If you’re on Next 13/14 "pages" API, export default handler(req,res).
// If on "app router" route handlers, adapt to (req: Request) => Response.

// Environment vars (already in your Vercel):
// IQPRO_API_URL=https://sandbox.basysiqpro.com
// IQPRO_API_KEY=api_xxx...
// APPLEPAY_KEY_ID=d3epo0f0i47dpgrupdag
// (currency optional) CURRENCY=USD

import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_BASE = process.env.IQPRO_API_URL || "https://sandbox.basysiqpro.com";
const API_KEY = process.env.IQPRO_API_KEY!;
const APPLE_KEY_ID = process.env.APPLEPAY_KEY_ID!;
const DEFAULT_CURRENCY = process.env.CURRENCY || "USD";

// Quick CORS helper
function addCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  addCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Expect one of:
    // 1) { type, amount, currency?, authorizationEvent: ApplePayPaymentAuthorizedEvent }
    // 2) { type, amount, currency?, temporary_token: string }
    const { type = "sale", amount, currency = DEFAULT_CURRENCY } = body || {};

    if (!amount || typeof amount !== "number") {
      return res
        .status(400)
        .json({ error: "amount (integer cents) is required" });
    }

    let payload: any = {
      type,
      amount,
      currency,
      payment_method: {},
    };

    if (body?.temporary_token) {
      // If you go through Tokenizer’s gateway first and it returns a temporary token, IQPro can accept that path too.
      payload.payment_method = { temporary_token: body.temporary_token };
    } else {
      // inside handler:
if (!process.env.APPLEPAY_KEY_ID) {
  console.error('[transaction] APPLEPAY_KEY_ID missing');
  return res.status(400).json({ error: 'Missing Apple Pay token or APPLEPAY_KEY_ID' });
}

let token = body?.appleToken
         || body?.authorizationEvent?.payment?.token; // legacy path

if (!token?.paymentData) {
  return res.status(400).json({ error: 'Missing Apple Pay token or APPLEPAY_KEY_ID' });
}

payload.payment_method = {
  apple_pay_token: {
    key_id: process.env.APPLEPAY_KEY_ID,
    pkpaymenttoken: {
      paymentData: {
        data: token.paymentData.data,
        signature: token.paymentData.signature,
        header: {
          publicKeyHash: token.paymentData.header.publicKeyHash,
          ephemeralPublicKey: token.paymentData.header.ephemeralPublicKey,
          transactionId: token.paymentData.header.transactionId
        },
        version: token.paymentData.version
      },
      paymentMethod: {
        displayName: token.paymentMethod?.displayName ?? null,
        network: token.paymentMethod?.network ?? null,
        type: token.paymentMethod?.type ?? null
      },
      transactionIdentifier: token.transactionIdentifier
    }
  }
};

    }

    // Send to IQPro Transactions API
    const resp = await fetch(`${API_BASE}/api/transactions`, {
      method: "POST",
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!resp.ok) {
      // Surface IQPro error body back to the client for easy debugging
      return res
        .status(resp.status)
        .json({ error: "IQPro error", status: resp.status, body: json });
    }

    return res.status(200).json(json);
  } catch (err: any) {
    console.error("[transaction] error", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
}
