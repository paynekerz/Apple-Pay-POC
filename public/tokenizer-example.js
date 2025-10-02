(async () => {
  try {
    console.log('[Tokenizer] Fetching config from /api/echo-verify...');
    const cfg = await (await fetch('/api/echo-verify?cb=' + Date.now())).json();

    if (!cfg?.publicKey || !cfg?.keyId || !cfg?.domain) {
      console.error('[Tokenizer] Missing config from /api/echo-verify:', cfg);
      return;
    }
    console.log('[Tokenizer] Config loaded:', cfg);

    const amountStr = (document.querySelector('#total-amount')?.textContent || '1.23').trim();

    let tokenizer;
    function init() {
      console.log('[Tokenizer] Initializing Tokenizer...');
      tokenizer = new Tokenizer({
        url: 'https://sandbox.basysiqpro.com',
        apikey: cfg.publicKey,
        container: '#container',

        submission: function (response) {
          console.log('[Tokenizer] Submission callback triggered:', response);

          const out = document.getElementById('out');
          if (out) {
            out.textContent = 'Tokenizer submission:\n' + JSON.stringify(response, null, 2);
          }

          if (response?.temporary_token) {
            console.log('[Tokenizer] temporary_token received:', response.temporary_token);

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
              console.log('[Tokenizer] Transaction response:', txn);
              if (out) out.textContent += '\n\nTransaction:\n' + JSON.stringify(txn, null, 2);
            })
            .catch(err => {
              console.error('[Tokenizer] Transaction error:', err);
              if (out) out.textContent += '\n\nTransaction error: ' + String(err);
            });
          } else {
            console.warn('[Tokenizer] No temporary_token returned in submission. Check Tokenizer config or backend flow.');
          }
        },

        settings: {
          payment: {
            types: ['apple_pay'],
            applePay: {
              key: cfg.keyId,
              autoPay: (authorizationEvent) => {
                console.log('[Tokenizer] autoPay invoked, sending authorizationEvent:', authorizationEvent);

                return fetch(`https://${cfg.domain}/api/checkout`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(authorizationEvent)
                })
                .then(r => r.json())
                .then(body => {
                  console.log('[Tokenizer] /api/checkout response:', body);
                  return body?.status === 'success' ? 'success' : 'fail';
                })
                .catch(err => {
                  console.error('[Tokenizer] autoPay fetch failed:', err);
                  return 'fail';
                });
              },
              version: 5,
              payment: {
                countryCode: 'US',
                currencyCode: 'USD',
                total: { label: 'Demo Order', amount: amountStr || '1.23' },
                merchantCapabilities: ['supports3DS']
              }
            }
          }
        },

        styles: {
          input: { height: '40px', 'font-size': '16px' }
        }
      });

      console.log('[Tokenizer] Initialized. Tokenizer instance:', tokenizer);

      // Optional manual trigger (like in your working sample)
      window.submitPayment = () => {
        console.log('[Tokenizer] submitPayment() invoked');
        tokenizer.submit();
      };
    }

    window.addEventListener('load', init);
  } catch (err) {
    console.error('[Tokenizer] Fatal init error:', err);
  }
})();
