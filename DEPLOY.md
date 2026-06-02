# Building & distributing the eCabin Ledger APK

This is a managed **Expo (SDK 55)** app. The APK is built with **EAS Build** (Expo's cloud
builder) — there's no `android/` folder to build locally. Config lives in `eas.json`.

## Prerequisites
- An Expo account (free tier builds APKs).
- The backend deployed and reachable at a public URL (see `ecabin-server/DEPLOY.md`).

## Important: the API URL is baked at build time
EAS cloud builds **do not upload your local `.env`**. The production API URL is set in
`eas.json` under each profile's `env` block:
```json
"preview":    { "env": { "EXPO_PUBLIC_API_URL": "http://macron-001-site3.ktempurl.com/api" } }
"production":  { "env": { "EXPO_PUBLIC_API_URL": "http://macron-001-site3.ktempurl.com/api" } }
```
Update both if the backend URL changes (e.g. a real domain + HTTPS). Without this the app
falls back to `http://localhost:4000/api` (`src/services/api.ts`) and a phone build is dead.

## Build the APK
```bash
npx eas-cli login                                   # one-time, your Expo account
npx eas-cli build -p android --profile preview      # internal-distribution APK
```
- `preview` → installable **APK** (set via `android.buildType: "apk"`), best for sideloading.
- `production` → `.aab` for the Google Play Store + auto version bump.

When the build finishes, EAS prints a download link to the `.apk`.

## Distribute
- **Sideload:** send the `.apk`; users enable "install from unknown sources".
- **MDM:** push the `.apk` through the client's device-management tooling.
- **Play Store (internal track):** use the `production` profile (`.aab`) + `eas submit`.

## Verifying locally before a build
```bash
npx tsc --noEmit                      # type check
npx expo export --platform android    # confirms the JS bundle compiles
```
Both pass on the current code.
