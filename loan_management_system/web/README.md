# Imara SACCO Admin Portal

React, Vite, Firebase Authentication and Cloud Firestore portal for SACCO administrators. All member account amounts are recorded and displayed in UGX.

## Local development

From this directory:

```powershell
npm install
npm run dev
```

Run the checks with `npm run lint` and `npm run build`.

## Firebase setup

The app is configured for Firebase project `wallet-application-1bd18`.

1. In Firebase Console, create/enable a Cloud Firestore database and enable Email/Password under Authentication sign-in providers.
2. Create an administrator under Authentication → Users. Copy that user’s UID.
3. In Firestore, create an `admins` collection document with its ID set to the administrator UID. Add a string `name` field. Admin provisioning is intentionally not available to users inside the portal.
4. From the repository root, deploy the Firestore security rules:

   ```powershell
   npx firebase deploy --only firestore
   ```

5. Sign in at the portal with the provisioned administrator’s credentials.

The rules deny access by default and allow access to SACCO data only when the authenticated user has a matching document in `admins`; authenticated members can access only their own linked records. Firestore indexes required by the mobile transaction history are also deployed by this command. Collections used by the apps are `admins`, `users`, `members`, `deposits`, `loans`, and `repayments`.

The **User accounts** page lists member profiles linked to activated mobile accounts, including name, member number, email, phone, member ID, account UID, loan limit, and creation date. PIN hashes and PIN lockout fields are intentionally not displayed. Only administrators can list the `users` collection under the deployed Firestore rules.

## Deploy Hosting

From the repository root:

```powershell
npx firebase deploy --only hosting
```

The Hosting predeploy hook builds this app into `web/dist`. Deploying Hosting and Firestore rules does not deploy Cloud Functions or require Cloud SQL.

## Loan calculations and statements

Loan approval creates a monthly reducing-balance amortisation schedule using the annual rate and term on the application. Repayments are applied against scheduled instalments in order and update the outstanding balance in the same Firestore transaction as the repayment record.

Member statements combine savings deposits, approved loan disbursements, and repayments. WhatsApp and email actions open a prefilled message in the administrator’s application; they do not send messages automatically.
