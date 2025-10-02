// api/checkout.ts
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  try {
    // The Apple Pay authorization event from Tokenizer arrives as the request body.
    const authEvent = req.body;

    // --- PoC path (docs' server example): simply say it succeeded ---
    // (This mirrors your server example file.)
    // Later, replace this with a call to the IQPro tokenization endpoint if needed,
    // or directly hit /api/transaction using a temporary token if the Tokenizer includes one.
    return res.status(200).json({ status: 'success' });
  } catch (e: any) {
    return res.status(500).json({ status: 'fail', error: e?.message || 'Unexpected error' });
  }
}
