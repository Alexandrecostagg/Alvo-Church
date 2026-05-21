Firebase helpers for local development and initialization.

Usage
- Server (admin):
  - import { initializeAdmin } from '@alvo/firebase/src/admin'
  - const firestore = initializeAdmin(process.env.FIREBASE_PROJECT_ID)

- Client (web):
  - import { initClient } from '@alvo/firebase/src/client'
  - await initClient()

Emulator notes
- To use the emulators locally set `FIRESTORE_EMULATOR_HOST=localhost:8080` and `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` or set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` for client-side code.
