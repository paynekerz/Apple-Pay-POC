(async () => {
  console.log('[Tokenizer] Fetching config from /api/echo-verify...');
  const cfg = await (await fetch('/api/echo-verify?cb=' + Date.now())).json();
  if (!cfg?.publicKey || !cfg?.keyId || !cfg?.domain) {
    console.error('[Tokenizer] Missing Tokenizer config:', cfg);
    return;
  }
  console.log('[Tokenizer] Config loaded:', cfg);

  // Optional demo amount
  const amountStr = (document.querySelector('#total-amount')?.textContent || '1.23').trim();

  let tokenizer;
  function init() {
    console.log('[Tokenizer] Initializing Tokenizer...');
    tokenizer = new Tokenizer({
      url: 'https://sandbox.basysiqpro.com',   // keep sandbox host since it works for you
      apikey: cfg.publicKey,
      container: '#container',

      submission: function (response) {
        console.log('[Tokenizer] Submission response:', response);
        const out = document.getElementById('out');
        const write = (label, data) => {
          if (!out) return;
          const prev = out.textContent === '—' ? '' : out.textContent + '\n\n';
          out.textContent = prev + label + '\n' + JSON.stringify(data, null, 2);
        };

        // Clearly show which path returned data
        if (response?.temporary_token) {
          // APPLE PAY path (Wallet/Tokenizer temporary token)
          write('APPLE PAY: temporary_token', { temporary_token: response.temporary_token });
          console.log('[Tokenizer] Apple Pay temporary_token:', response.temporary_token);

          // (Optional) simulate authorization with your existing endpoint
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
            console.log('[Tokenizer] /api/transaction response:', txn);
            write('Transaction (Apple Pay)', txn);
          })
          .catch(err => {
            console.error('[Tokenizer] /api/transaction error:', err);
            write('Transaction error (Apple Pay)', String(err));
          });

        } else if (response?.token) {
          // CARD path (Tokenizer card token)
          write('CARD: token', { token: response.token });
          console.log('[Tokenizer] Card token:', response.token);

          // For the PoC we just log the card token. If you want to hit your gateway:
          // fetch('/api/transaction', { ... body: JSON.stringify({ type:'authorize', amount: ..., card_token: response.token }) })
          // .then(...)...

        } else {
          write('UNKNOWN submission payload', response);
          console.warn('[Tokenizer] No temporary_token or token in submission payload.');
        }
      },

      settings: {
        payment: {
          // Put 'card' first so the card form is the default visible method.
          types: ['card', 'apple_pay'],

          // Apple Pay config
          applePay: {
            key: cfg.keyId,
            autoPay: (authorizationEvent) => {
              console.log('[Tokenizer] autoPay invoked; posting authorizationEvent to /api/checkout', authorizationEvent);
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
          },

          // Optional: make the card fields strict/relaxed
          card: { strict_mode: false, requireCVV: true }
        },

        // Optional UX, mirrors your working example
        user:     { showInline: true, showName: true, showEmail: true, showPhone: true, showTitle: true },
        billing:  { show: false },
        shipping: { show: false }
      },

      styles: {
        input: { height: '40px', 'font-size': '16px' }
      }
    });

    console.log('[Tokenizer] Initialized. Instance:', tokenizer);

    // 🔘 NEW: explicit button to submit CARD
    const cardBtn = document.getElementById('submitCardBtn');
    if (cardBtn) {
      cardBtn.addEventListener('click', () => {
        console.log('[Tokenizer] submitCardBtn clicked — submitting CARD via tokenizer.submit()');
        // Tokenizer treats the currently visible method as the target.
        // With 'card' listed first, the card form should be active by default.
        tokenizer.submit();
      });
    }

    // Optional: expose manual hook just like your working sample
    window.submitPayment = () => {
      console.log('[Tokenizer] submitPayment() invoked');
      tokenizer.submit();
    };
  }

  window.addEventListener('load', init);
})();
