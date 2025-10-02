(async () => {
  // Pull public key + apple-pay config from your echo endpoint
  const cfg = await (await fetch('/api/echo-verify?cb=' + Date.now())).json();
  if (!cfg?.publicKey || !cfg?.keyId || !cfg?.domain) {
    console.error('Missing Tokenizer config'); return;
  }

  // Optional: read a visible total from your page; default $1.23
  const amountStr = (document.querySelector('#total-amount')?.textContent || '1.23').trim();

  let tokenizer;
  function init() {
    tokenizer = new Tokenizer({
      // TIP: PAYMENT_PROVIDER_URL -> app.basysiqpro.com
      url: 'https://app.basysiqpro.com',
      // publishable key (safe for browser)
      apikey: cfg.publicKey,
      container: '#container',

      submission: function (response) {
        console.log('Tokenizer submission response:', response);

        // Show on-page
        const out = document.getElementById('out');
        if (out) out.textContent = 'Tokenizer submission:\n' + JSON.stringify(response, null, 2);

        // If Tokenizer returns a temporary token, immediately simulate an authorization
        if (response?.temporary_token) {
          fetch('/api/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'authorize',
              amount: Math.round(parseFloat(amountStr || '1.23') * 100),
              apple_pay_temporary_token: response.temporary_token
            })
          })
          .then(r => r.json())
          .then(txn => {
            console.log('Transaction response:', txn);
            if (out) out.textContent += '\n\nTransaction:\n' + JSON.stringify(txn, null, 2);
          })
          .catch(err => {
            console.error(err);
            if (out) out.textContent += '\n\nTransaction error: ' + String(err);
          });
        } else {
          // If your build doesn’t expose a temporary_token, we still complete the PoC path:
          // Tokenizer called autoPay -> /api/checkout, which returned {status:'success'}.
          // That demonstrates the end-to-end Apple Pay sheet + gateway handoff.
        }
      },

      settings: {
        payment: {
          // Apple Pay only for this PoC; add 'card','ach' if you want
          types: ['apple_pay'],

          // Apple Pay config for Simple Domain Registration
          applePay: {
            // your Apple Pay Key ID from IQPro (APPLEY key row "ID")
            key: cfg.keyId,

            // TIP: YOUR_URL -> your deployed domain (host only)
            // Tokenizer will send the Apple authorization event to your backend.
            // Your /api/checkout should return {status:'success'} for the PoC.
            autoPay: (authorizationEvent) => {
              return fetch(`https://${cfg.domain}/api/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authorizationEvent)
              })
              .then(r => r.json())
              .then(body => (body?.status === 'success' ? 'success' : 'fail'))
              .catch(() => 'fail');
            },

            // Apple Pay sheet parameters
            version: 5,
            payment: {
              countryCode: 'US',
              currencyCode: 'USD',
              total: { label: 'Demo Order', amount: amountStr || '1.23' },
              merchantCapabilities: ['supports3DS']
            }
          }
        },

        // (Optional) show some extra sections if you want a fuller form,
        // kept here to mimic your working style sample:
        user:     { showInline: true, showName: true, showEmail: true, showPhone: true, showTitle: true },
        billing:  { show: false },
        shipping: { show: false }
      },

      // (Optional) light styling hook like your working example
      styles: {
        input: { height: '40px', 'font-size': '16px' }
      }
    });

    // Expose a submit() button like your sample (not required for Apple Pay flow)
    window.submitPayment = () => tokenizer.submit();
  }

  window.addEventListener('load', init);
})();
