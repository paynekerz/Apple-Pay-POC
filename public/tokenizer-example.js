(async () => {
  // Pull publishable key + domain
  const cfg = await (await fetch('/api/echo-verify?cb=' + Date.now())).json();
  if (!cfg?.publicKey || !cfg?.keyId || !cfg?.domain) {
    console.error('Missing Tokenizer config'); return;
  }

  // OPTIONAL: read a demo amount from your page
  const requestedAmount = (document.querySelector('#total-amount')?.innerText || '1.23');

  // Instantiate IQPro Tokenizer
  const t = new Tokenizer({
    // TIP: replace {PAYMENT_PROVIDER_URL} with app.basysiqpro.com
    url: 'https://sandbox.basysiqpro.com',
    // Your publishable/public key (safe to expose)
    apikey: cfg.publicKey,

    // Where to render
    container: '#pay',

    // Called after Tokenizer finishes (match docs example)
    submission: (resp) => {
      // Display status; if Tokenizer includes a token, log it too
      console.log('Tokenizer submission:', resp);
      const logBox = document.getElementById('out');
      const nice = JSON.stringify(resp, null, 2);
      logBox.textContent = `Tokenizer submission:\n${nice}`;

      // If your build exposes a token, you can immediately authorize it:
      if (resp?.temporary_token) {
        fetch('/api/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'authorize',
            amount: Math.round(parseFloat(requestedAmount) * 100),
            apple_pay_temporary_token: resp.temporary_token
          })
        }).then(r => r.json()).then(data => {
          console.log('Transaction via temporary_token:', data);
          logBox.textContent += `\n\nTransaction:\n${JSON.stringify(data, null, 2)}`;
        }).catch(err => console.error(err));
      }
    },

    // Match the docs' settings structure (card + apple_pay supported; we’ll just show apple_pay)
    settings: {
      payment: {
        types: ['apple_pay'],             // minimal PoC: Apple Pay only
        card: { strict_mode: false, requireCVV: false }, // harmless defaults

        applePay: {
          // This is your Apple Pay Key ID from IQPro (what we called APPLEPAY_KEY_ID)
          key: cfg.keyId,

          // TIP: replace {YOUR_URL} with your **webshop domain** (your Vercel deploy)
          // The docs' example calls your backend with the Authorization Event:
          autoPay: (authorizationEvent) => {
            return fetch(
              `https://${cfg.domain}/api/checkout`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authorizationEvent) }
            )
            .then(r => r.json())
            .then(body => (body.status === 'success' ? 'success' : 'fail'))
            .catch(() => 'fail');
          },

          // Apple Pay params (from example)
          version: 5,
          payment: {
            countryCode: 'US',
            currencyCode: 'USD',
            total: { label: 'Total Amount', amount: requestedAmount },
            merchantCapabilities: ['supports3DS']
          }
        }
      }
    }
  });
})();
