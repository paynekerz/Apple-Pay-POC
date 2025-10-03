# Apple Pay Integration Setup Guide  

## Requirements  

Before you begin, make sure you have the following:  

- An **Apple Developer Account**  
- An **Apple device** capable of development and testing (iPhone, iPad, or Mac)  
- An **Apple Sandbox Account** (for testing transactions)  
- If you are using a **Mac Mini** or other **compatable Mac Desktop** for development, a **Magic Keyboard with Touch ID** (or another biometric-capable device) for Apple Pay authentication  
- An **iPhone**

---

## Domain Registration  

Apple requires domain verification to use Apple Pay on the web. This ensures your domain is trusted to initiate Apple Pay sessions.  

1. **Log in to your Apple Developer Account** and navigate to **Certificates, Identifiers & Profiles → Identifiers**.  
     

2. **Create a Merchant ID**. Use a reverse URL format (for example, `com.yourcompany.merchant`).  
     

3. Scroll down to **Merchant Domains**, then select **Add Domain**.  
   - Enter your domain (for example, `example.com`) and click **Save**.  

4. **Download the `apple-developer-merchantid-domain-association.txt` file** provided by Apple.  
   - Important: This file must be hosted at a specific location to validate your domain.  
   - Place it in your site’s `.well-known` directory:  
     ```
     https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association.txt
     ```
     

5. Once the file is uploaded, return to the Apple Developer portal and click **Verify** next to your domain.  

---

## IQPro Gateway Configuration  

Once your Apple domain is verified, you need to configure it inside your IQPro gateway:  

1. Log in to your **IQPro Gateway**.  
2. If you haven’t already, **activate the Apple Pay service** under **Settings → Services**.  
3. Go to **Settings → Apple Pay**.  
4. Select **Add New Certificate**, then choose **Custom Configuration**.  
     
5. Enter the same domain you used for the `apple-developer-merchantid-domain-association.txt` file and save.  
6. IQPro will generate a **Key ID**.  
   - This Key ID links your Apple Pay setup to IQPro.  
   - Save this Key ID in your environment variables (`APPLEPAY_KEY_ID`) for later use in your integration.  

---

## Sandbox vs Production Testing  

By default, Apple Pay assumes a production environment. To test with IQPro’s sandbox gateway, you must use an Apple Sandbox account.  

- You can create a sandbox tester account here:  
  [Apple Pay Sandbox Testing](https://developer.apple.com/apple-pay/sandbox-testing/)  

- This page also provides test card numbers for simulating different Apple Pay transaction scenarios (for example, successful payment, declined card, insufficient funds).  

Important: If you don’t use a sandbox account with the IQPro sandbox gateway, Apple Pay transactions will fail during development.  

Whichever device you choose, you **must** be signed in as your test user on the device. Failure to do so will cause Apple Pay to utilize it's production environment causing transactions to fail.


Apple Pay PoC (IQPro Sandbox)
=============================

Requirements
------------

-   Apple Developer account

-   Apple device capable of development and testing

-   Apple Pay sandbox tester account

-   If you develop on a Mac and plan to test on the same machine, a Touch ID--enabled Magic Keyboard (or another supported biometric device) for Apple Pay verification

Simple Domain Registration
--------------------------

1.  In your Apple Developer account, go to **Certificates, Identifiers & Profiles → Identifiers**.

2.  Create a **Merchant ID** using reverse‑URL format (for example, `merchant.com.example.shop`).

3.  In the Merchant ID, open **Merchant Domains** and click **Add Domain**. Enter your domain and save.

4.  Download the file named **`apple-developer-merchantid-domain-association.txt`**.

    -   This file is used by both IQPro and Apple to verify your site. It **must** be served at:\
        `/.well-known/apple-developer-merchantid-domain-association.txt` (over HTTPS).

    -   Place the file in your site's `public/.well-known/` directory (or the equivalent path in your framework).

5.  Back in the Apple Developer portal, click **Verify** on the Merchant Domain to confirm the file is reachable.

6.  In your IQPro gateway, enable **Apple Pay** under **Settings → Services** if it is not already enabled.

7.  Go to **Settings → Apple Pay**. Click **Add New Certificate**, then choose **Custom Configuration**.

8.  Add the same domain you verified with Apple and save. IQPro will generate an **ID** for this Apple Pay configuration---this is your **Apple Pay Key ID**. Store it in your environment for later use.

Tokenizer setup
---------------

This section shows a minimal end‑to‑end setup for IQPro Tokenizer with Apple Pay. It uses:

-   A static page that loads the Tokenizer script and renders a payment container.

-   A tiny server endpoint that accepts the Tokenizer submission and returns JSON.

> Replace `{PAYMENT_PROVIDER_URL}` with `https://app.basysiqpro.com` and use your own publishable API key and Apple Pay Key ID from IQPro.

### 1) Add the Tokenizer script and containers

Place the following in your checkout page's `<head>` and body:

```
<!-- HEAD: load the tokenizer -->
<script src="https://{PAYMENT_PROVIDER_URL}/tokenizer/tokenizer.js"></script>

<!-- BODY: amount display + container for the Tokenizer button/fields -->
<h3>Total Amount: $ <span id="total-amount">15.00</span></h3>
<div id="pay"></div>
<button class="btn primary" id="submitBtn">Submit</button>

```

### 2) Initialize the Tokenizer (browser)

```
(async () => {
  // Get config from your backend (publishable key, apple key id, domain)
  const cfg = await (await fetch('/api/echo-verify?cb=' + Date.now())).json();

  const amount = (document.getElementById('total-amount')?.textContent || '1.23').trim();

  const t = new Tokenizer({
   // Depending on your environment
    url: 'https://app.basysiqpro.com',
    apikey: cfg.publicKey,           // Public API Key
    container: '#pay',
    settings: {
      payment: {
        types: ['apple_pay'],
        applePay: {
          key: cfg.keyId,            // IQPro Apple Pay Key ID
          version: 5,
          payment: {
            countryCode: 'US',
            currencyCode: 'USD',
            total: { label: 'Demo Order', amount }
          },
          // Send Apple Pay token to your server to process with IQPro
          autoPay: (authorizationEvent) => {
            return fetch('/api/transaction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'sale',
                amount: Math.round(parseFloat(amount) * 100),
                currency: 'USD',
                appleToken: {
                  paymentData: authorizationEvent.payment.token.paymentData,
                  paymentMethod: authorizationEvent.payment.token.paymentMethod,
                  transactionIdentifier: authorizationEvent.payment.token.transactionIdentifier,
                  keyId: cfg.keyId
                }
              })
            })
            .then(r => r.json())
            .then(res => (res?.status === 'approved' || res?.result === 'approved') ? 'success' : 'fail')
            .catch(() => 'fail');
          }
        }
      }
    },
    submission: (response) => {
      console.log('[Tokenizer] submission =>', response);
      // Optionally display the response to the shopper
      document.querySelector('#out')?.replaceChildren(document.createTextNode(JSON.stringify(response, null, 2)));
    }
  });

  // Optional explicit submit for non‑Apple‑Pay flows
  document.getElementById('submitBtn')?.addEventListener('click', () => t.submit());
})();

```

### 3) Minimal server endpoint (Node.js)

> In production, forward the received Apple Pay token to the IQPro Transactions API (`/api/transaction`) with your server API key in the `Authorization: Api-Key ...` header. The example below only echoes success so you can wire the client without touching the gateway yet.

```
import { createServer } from 'node:http';

const hostname = '0.0.0.0';
const port = 8081;

const server = createServer((req, res) => {
  // TODO: read JSON body and send its appleToken to IQPro Transactions API
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'success' }) + '\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

```
Processing a transaction (Apple Pay → IQPro Transactions API)
-------------------------------------------------------------

This section shows how to take the Apple Pay token from the browser and submit it to IQPro's sandbox **Transactions API**. The recommended pattern is:

**Browser** → your **server endpoint** (`/api/transaction`) → **IQPro Sandbox** (`https://sandbox.basysiqpro.com/api/transaction`).

Do not send your IQPro API key from the browser. Keep it on the server.

```
fetch("/api/transaction", {
  method: "POST",
  headers: {
    "Authorization": "APIKEY",
    "Content-Type": "application/json",
  },
  body: {
    "type": "sale",
    "amount": 1299,
    "currency": "USD",
    "payment_method": {
      "apple_pay_token": {
        "key_id": "d1rbau3neq31b1gi41ig",
        "pkpaymenttoken": {
          "paymentData": {
            "data": "RAo5D**********9Nmmw==",
            "signature": "MIAGC**********AAAA=",
            "header": {
              "publicKeyHash": "h**********ZUo=",
              "ephemeralPublicKey": "MF**********h/g==",
              "transactionId": "15f20c26be554082c4176ebcd6ad7bd6dcb2f8c3b67144453a264f84a92c7dc2"
            },
            "version": "EC_v1"
          },
          "paymentMethod": {
            "displayName": "Visa 1111",
            "network": "Visa",
            "type": "debit"
          },
          "transactionIdentifier": "15f20c26be554082c4176ebcd6ad7bd6dcb2f8c3b67144453a264f84a92c7dc2"
        }
      }
    }
  }
})
.then(response => response.text())
.then(data => console.log(data));
```