# eCabin Ledger

Lightweight inspection and asset-management app for in-flight cabin elements (mobile app) with a Node.js/Express backend.

This repository contains two primary parts:

- `eCabinLedger/` — React Native (Expo) mobile app used by cabin crew and technicians.
- `server/` — Node.js Express API that serves data and handles uploads.

**Contents**

- **Prerequisites**: Node.js, npm, Expo CLI (optional), Android Studio (for Android emulator) or physical devices.
- **Quick start**: install dependencies, configure environment, run server and app.

---

## Quick Start (Developer)

1. Clone the repo and switch to the `main` branch:

```bash
git clone https://github.com/spidy7878/eCabin-Ledger.git
cd eCabin-Ledger
git checkout main
```

2. Server setup (API)

```bash
cd server
npm install
# Create a .env file (see .env.example below) and fill in your credentials
npm run dev   # runs with nodemon; or `npm start` to run node directly
```

The server runs by default on port `4000` (configurable in the `.env`).

3. Mobile app (Expo)

Open a second terminal and run:

```bash
cd eCabinLedger
npm install
npm start
# or use `npm run android` / `npm run ios` to run on a connected device/emulator
```

Notes on connecting the mobile app to the API:
- The mobile client uses a hard-coded `API_BASE_URL` in `eCabinLedger/src/services/api.ts`. Update that value to point to your running server (e.g. `http://192.168.1.10:4000/api` for a physical device on the same network, or `http://10.0.2.2:4000/api` for an Android AVD).

---

## Environment variables (server)

Do NOT commit secrets. Create `server/.env` from the variables below:

```
DB_SERVER=
DB_PORT=1433
DB_USER=
DB_PASSWORD=
DB_NAME=
PORT=4000
NODE_ENV=development
CORS_ORIGIN=*
JWT_SECRET=
```

You can copy `server/.env` from `server/.env.example` (not included) and fill in values locally.

---

## Repo structure

- `eCabinLedger/` — Expo/React Native app
  - `src/` — app source (components, screens, services)
  - `app.json`, `eas.json` — Expo configuration
- `server/` — Express API
  - `src/` — server source and routes
- `uploads/` — example upload directories (generated at runtime)

---

## Common Commands

- Install server deps: `cd server && npm install`
- Start server (dev): `cd server && npm run dev`
- Install mobile deps: `cd eCabinLedger && npm install`
- Start Expo: `cd eCabinLedger && npm start`
- Build Android (Expo): `cd eCabinLedger && npm run android`

---

## Contributing

- Create feature branches off `main` and open pull requests.
- Keep secrets out of the repo — use environment variables or secret management.

## Troubleshooting

- If the mobile app can't reach the API, check `API_BASE_URL` in `eCabinLedger/src/services/api.ts` and ensure the server machine is reachable from the device/emulator.
- For Android emulator use `http://10.0.2.2:4000/api` as the host for the local machine.

---

## License & Contact

This project is private. For access and questions, contact the repository owner.
