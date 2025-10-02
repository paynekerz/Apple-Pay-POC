(async () => {
  console.log("[Tokenizer] Fetching config from /api/echo-verify...");
  const cfg = await (await fetch("/api/echo-verify?cb=" + Date.now())).json();
  if (!cfg?.publicKey || !cfg?.keyId || !cfg?.domain) {
    console.error("Missing Tokenizer config");
    return;
  }

  console.log("[Tokenizer] Config loaded:", cfg);

  // Optional: read a visible total from your page; default $1.23
  const amountStr = (
    document.querySelector("#total-amount")?.textContent || "1.23"
  ).trim();

  let tokenizer;
  function init() {
    console.log("[Tokenizer] Initializing Tokenizer...");
    tokenizer = new Tokenizer({
      // PAYMENT_PROVIDER_URL -> app.basysiqpro.com
      url: "https://sandbox.basysiqpro.com",
      // publishable key (safe for browser)
      apikey: cfg.publicKey,
      container: "#container",

      submission: function (response) {
        console.log("Tokenizer submission response:", response);

        // Show on-page
        const out = document.getElementById("out");
        if (out)
          out.textContent =
            "Tokenizer submission:\n" + JSON.stringify(response, null, 2);

        // If Tokenizer returns a temporary token, immediately simulate an authorization
        if (response?.token) {
          console.log("[Tokenizer] temporary_token received:", response.token);
          fetch("/api/transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "authorize",
              amount: Math.round(parseFloat(amountStr || "1.23") * 100),
              apple_pay_temporary_token: response.temporary_token,
            }),
          })
            .then((r) => r.json())
            .then((txn) => {
              console.log("Transaction response:", txn);
              if (out)
                out.textContent +=
                  "\n\nTransaction:\n" + JSON.stringify(txn, null, 2);
            })
            .catch((err) => {
              console.error(err);
              if (out)
                out.textContent += "\n\nTransaction error: " + String(err);
            });
        } else {
          // Tokenizer called autoPay -> /api/checkout, which returned {status:'success'}.
          // That demonstrates the end-to-end Apple Pay sheet + gateway handoff.
        }
      },

      settings: {
        payment: {
          // Apple Pay only for this PoC; add 'card','ach' if you want
          types: ["apple_pay"],

          // Apple Pay config for Simple Domain Registration
          applePay: {
            // your Apple Pay Key ID from IQPro
            key: cfg.keyId,

            // Tokenizer will send the Apple authorization event to backend.
            // Your /api/checkout should return {status:'success'} for the PoC.
            // Inside applePay.settings.payment.applePay.autoPay
            autoPay: (authorizationEvent) => {
              console.log(
                "[Tokenizer] autoPay invoked, sending authorizationEvent:",
                authorizationEvent
              );

              const amountStr = (
                document.querySelector("#total-amount")?.textContent || "1.23"
              ).trim();
              const amountCents = Math.round(parseFloat(amountStr) * 100);

              const token = authorizationEvent?.payment?.token;
              const appleToken = token
                ? {
                    paymentData: {
                      data: token.paymentData?.data,
                      signature: token.paymentData?.signature,
                      header: {
                        publicKeyHash: token.paymentData?.header?.publicKeyHash,
                        ephemeralPublicKey:
                          token.paymentData?.header?.ephemeralPublicKey,
                        transactionId: token.paymentData?.header?.transactionId,
                      },
                      version: token.paymentData?.version,
                    },
                    paymentMethod: {
                      displayName: token.paymentMethod?.displayName ?? null,
                      network: token.paymentMethod?.network ?? null,
                      type: token.paymentMethod?.type ?? null,
                    },
                    transactionIdentifier: token.transactionIdentifier,
                  }
                : null;

                console.log(appleToken);

              return fetch("/api/transaction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "sale",
                  amount: amountCents,
                  currency: "USD",
                  payment_method: {
                    applepay: {
                      key: cfg.keyId, 
                      token: appleToken, 
                    },
                  },
                }),
              })
                .then((r) => r.json())
                .then((body) => {
                  console.log("[Tokenizer] /api/transaction response ->", body);
                  return body?.status === "approved" ||
                    body?.result === "approved"
                    ? "success"
                    : "success";
                })
                .catch((err) => {
                  console.error("[Tokenizer] /api/transaction error", err);
                  return "fail";
                });
            },

            // Apple Pay sheet parameters
            version: 5,
            payment: {
              countryCode: "US",
              currencyCode: "USD",
              total: { label: "Demo Order", amount: amountStr || "1.23" },
              merchantCapabilities: ["supports3DS"],
            },
          },
        },

        user: {
          showInline: true,
          showName: true,
          showEmail: true,
          showPhone: true,
          showTitle: true,
        },
        billing: { show: false },
        shipping: { show: false },
      },

      styles: {
        input: { height: "40px", "font-size": "16px" },
      },
    });

    console.log("[Tokenizer] Initialized. Tokenizer instance:", tokenizer);

    window.submitPayment = () => {
      console.log("[Tokenizer] submitPayment() invoked");
      tokenizer.submit();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
