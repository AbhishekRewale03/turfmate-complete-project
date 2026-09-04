# Firebase setup

1. Create one Firebase project per environment and enable Email/Password Authentication and Firestore.
2. Copy `.firebaserc.example` to `.firebaserc` and replace the project alias.
3. Copy `.env.example` to `.env.local` and add the Firebase web configuration. Never commit `.env.local`.
4. On Google-hosted infrastructure, use Application Default Credentials. Else set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and a quoted `FIREBASE_PRIVATE_KEY`; escaped `\n` is normalized by the Admin initializer.
5. Deploy with `firebase deploy --only firestore:rules,firestore:indexes,storage`.
6. Seed development with `npm run firebase:seed -- --tenant=arena-11 --slug=arena-11`.
7. Create the first owner with `OWNER_PASSWORD=... npm run firebase:create-owner -- --email=owner@example.com --tenant=arena-11`. Send the Firebase verification email before sign-in.

For local emulators, set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, and `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`. Production seed/owner scripts refuse to run unless `--confirm-production=true` is explicit.
