// api/public/applepay/validatemerchant.ts
// Proxies WalletJS merchant validation to IQPro, adding your key/domain.
// Also handles CORS so the browser can call it directly.

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  console.error("VALIDATE MERCHANT BODY:", body);

  return new Response(JSON.stringify({ ok: true }));
}

// export default async function handler(req: any, res: any) {
//   // CORS (preflight + response)
//   res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
//   res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   if (req.method === "OPTIONS") return res.status(204).end();

//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const IQPRO_API_URL = process.env.IQPRO_API_URL!;
//     const IQPRO_API_KEY = process.env.IQPRO_API_KEY!;
//     const KEY_ID = process.env.APPLEPAY_KEY_ID!;
//     const DOMAIN = process.env.APPLEPAY_DOMAIN!;

//     const { ValidationUrl } = req.body || {};
//     if (!ValidationUrl) {
//       return res.status(400).json({ error: "Missing ValidationUrl" });
//     }
//     if (!IQPRO_API_URL || !IQPRO_API_KEY || !KEY_ID || !DOMAIN) {
//       return res.status(500).json({ error: "Server missing Apple Pay env vars" });
//     }

//     // This is the IQPro endpoint that actually talks to Apple and returns the merchant session.
//     const forwardBody = {
//       PKeyCompany: KEY_ID,
//       DomainName: DOMAIN,
//       ValidationUrl,                 // e.g. https://apple-pay-gateway.apple.com/paymentservices/startSession
//     };

//     console.log("=== Forward Body Being Sent to IQPro ===");
//     console.log(JSON.stringify(forwardBody, null, 2));

//     const r = await fetch(`${IQPRO_API_URL}/api/public/applepay/validatemerchant`, {
//       method: "POST",
//       headers: {
//         "Authorization": IQPRO_API_KEY,
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify(forwardBody)
//     });

//     const data = await r.json().catch(() => ({}));
//     return res.status(r.status).json(data);
//   } catch (e: any) {
//     return res.status(500).json({ error: e?.message || "Unexpected error" });
//   }
// }
