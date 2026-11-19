# USSD webhook

The `ussdWebhook` HTTP function accepts Africa's Talking-style `POST`
requests using either JSON or `application/x-www-form-urlencoded` fields:
`sessionId`, `serviceCode`, `phoneNumber`, and cumulative `text`. Responses
are plain text prefixed with `CON ` or `END `.

The webhook matches normalized Ugandan phone numbers to `users.phone` (or to
a linked member in `members`), and writes loan requests and deposit requests
to the existing `loans` and `deposits` collections. Balances are derived from
the current deposit and loan records. Mini statements read `transactions`
when available and otherwise combine the existing deposits, loans, and
repayments collections.

## Local test

From the project root, run:

```powershell
npx firebase-tools emulators:start --only functions,firestore
```

Open `/ussd-simulator.html` on the local Hosting/Vite server and enter the
phone number linked to an activated member account. The simulator sends
requests to `http://127.0.0.1:5001/wallet-application-1bd18/us-central1/ussdWebhook`.
The Firestore Emulator starts empty; add a `members` document and a linked
`users` document in the Emulator UI (`http://127.0.0.1:4000`) before testing.
Set the user's `memberId`, `memberNo`, `name`, and phone number to match the
member record.
USSD PINs are stored as salted scrypt hashes. A first-time PIN must be set
before dialing again to use the menu.

## Mobile Money collection

To send a real collection request, configure `USSD_MOMO_API_URL` in the
Functions environment (for example in
`functions/.env.wallet-application-1bd18`) and set the token as a Firebase
secret:

```powershell
npx firebase-tools functions:secrets:set USSD_MOMO_API_TOKEN
```

For emulator-only testing, put the token in `.secret.local` beside
`firebase.json`. The configured HTTPS gateway must accept a JSON `POST` with
`phoneNumber`, `amount`, `currency`,
`reference`, and `metadata`, and return a successful HTTP status. The API
token is sent in the Authorization header. Without these values, requests are still
recorded as pending but the webhook reports that it could not send a payment
prompt; emulator testing does not require gateway credentials.

Set `SACCO_NAME` to change the menu heading. `USSD_LOAN_ANNUAL_RATE` controls
the annual interest rate attached to a USSD loan application (defaults to
12). After configuration, deploy with:

```powershell
npx firebase-tools deploy --only functions
```
