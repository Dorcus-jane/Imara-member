# Imara Member (mobile app)

Member app for the Imara SACCO system. Built from the Figma designs (16 screens).
It runs on sample data for now; the backend is connected later through src/data/api.ts.

## Run it
1. npm install
2. npx expo start
3. Scan the QR code with Expo Go (phone and laptop on the same Wi-Fi).
   If the QR code will not connect: npx expo start --tunnel

## Demo accounts (the sign-in screen is pre-filled with the first one)
- amina@example.com / amina123  (12 months of history, risk score 0.85)
- rolex@example.com / rolex123  (new member, shows "Not enough history")
- Sign up screen: member number YM 2334, email amina@example.com, invitation code IMARA-2026

## Where things are
- App.tsx                  fonts, navigation, sign-in state
- src/theme/theme.ts       colours, fonts and text styles from Figma
- src/data/api.ts          THE DATA LAYER. Replace its function bodies with Firestore later.
- src/data/sampleData.ts   demo data matching the designs
- src/data/riskScore.ts    risk score from SRS section 8
- src/screens/             one file per screen
- src/components/          shared pieces (cards, buttons, tab bar, dialogs)
- assets/banknotes.jpg     photo behind the sign-in welcome card
