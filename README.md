# Wakey Wakey

**Never miss your stop again.** Wakey Wakey is a location-based alarm app for commuters and travelers — instead of setting a time, you set a *place*. The app tracks your live position and fires a full-screen alarm (sound + vibration) the moment you enter a radius around your destination, so you can safely doze off on a bus, train, or long drive.

Built as a React + TypeScript web app, packaged for Android via [Capacitor](https://capacitorjs.com/). Fully client-side — no backend, no account, no server. All data lives on-device in `localStorage`.

## Features

- **Location-based alarms** — drop a pin (search, tap the map, or use your current location) and set a trigger radius from 50m to 50km.
- **Live GPS tracking** — a pulsing marker follows your position in real time on an OpenStreetMap/Leaflet map, with a dashed geofence ring around each active alarm.
- **Battery Saver Mode** — switches from high-accuracy GPS to low-power Wi-Fi/network/IP-based location for long trips, so tracking doesn't drain your battery.
- **Multiple simultaneous alarms**, each with its own destination, radius, category (transit / work / home / airport / other), and tone.
- **Four synthesized alarm tones** (Gentle Wake, Station Bell, Subway Chime, Urgency Pulse) generated live with the Web Audio API — no audio files to ship or load.
- **Native vibration** on Android via a small custom Capacitor plugin that loops a buzz pattern at the OS level (see [Native Android vibration](#native-android-vibration) below).
- **Snooze / dismiss** controls on the full-screen alarm alert.
- **Offline-capable** — GPS tracking, geofence triggering, alarm sound/vibration, and alarm storage all work with zero connectivity once the app has been opened online at least once (only live map tiles and address search need a connection).
- **PWA-installable** — also works as an installable Progressive Web App on desktop/mobile browsers, independent of the Android build.

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript, Tailwind CSS 4 |
| Build | Vite 6 |
| Maps | Leaflet + OpenStreetMap tiles |
| Geocoding / search | Nominatim (OpenStreetMap) |
| Audio | Web Audio API (synthesized tones, no audio assets) |
| Storage | Browser `localStorage` (no backend) |
| Native shell | Capacitor 8 (Android) |
| Vibration | Custom native Android plugin (`AlarmVibrationPlugin`) + `@capacitor/haptics` web fallback |

There is intentionally **no backend and no third-party auth/database** — an earlier version synced alarms and location to Firebase, but it was fully removed in favor of a simpler, private, fully-local design.

## Project structure

```
src/
  App.tsx                    # Top-level state, geolocation watchers, geofence engine
  components/
    MapView.tsx               # Interactive map, search, alarm pin placement
    AlarmsView.tsx             # Alarm list / management screen
    ConfigureAlarmModal.tsx    # Create / edit alarm form
    AlarmTriggeredScreen.tsx   # Full-screen alert shown when a geofence is entered
    SettingsView.tsx           # Battery Saver toggle, tone picker, location calibration
    NavigationBar.tsx          # Bottom tab bar
  services/
    alarmService.ts            # localStorage read/write for alarms + default tone
  utils/
    geo.ts                     # Distance math, geocoding/search, default starting location
    internetLocation.ts        # Low-power Wi-Fi/IP-based location fetch (Battery Saver)
    audio.ts                   # Synthesized alarm tones + vibration orchestration
    nativeVibration.ts         # Typed wrapper around the custom native vibration plugin
  types.ts                     # Alarm / UserLocation / shared types

android/                      # Capacitor-generated native Android project
  app/src/main/java/com/wakeywakey/app/
    MainActivity.java          # Registers AlarmVibrationPlugin
    AlarmVibrationPlugin.java  # Native Android vibration (see below)

public/                       # Static assets, PWA manifest, service worker
assets/app_icon.png           # Master app icon source (regenerated into public/icon-*.png on build)
generate-pwa-assets.js        # Regenerates PWA icons + screenshots from assets/app_icon.png
```

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Opens the dev server at `http://localhost:3000`. Location features require either a real GPS-capable device or a browser's location override — desktop browsers can simulate this via DevTools' sensor panel.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Regenerate PWA icons/screenshots, then build the production web bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check the project (`tsc --noEmit`) |

## Building the Android APK

The Android project lives in `android/` (Capacitor-managed). To rebuild it after making changes:

```bash
npm run build           # produces dist/
npx cap sync android    # copies dist/ into the native project, syncs plugins
```

Then build with Gradle. You'll need the Android SDK and a JDK (17+) available — set `JAVA_HOME` and `ANDROID_HOME`/`ANDROID_SDK_ROOT` before running:

```bash
cd android
./gradlew assembleDebug      # unsigned debug APK, for local testing
./gradlew assembleRelease    # signed release APK (see signing below)
```

Output APKs land in `android/app/build/outputs/apk/{debug,release}/`.

### Release signing

Release builds are signed using `android/keystore.properties` (gitignored) pointing at a keystore file (also gitignored, expected at `keystore/wakeywakey-release.keystore` by default). Neither is committed to this repo. To produce your own signed release build:

1. Generate a keystore:
   ```bash
   keytool -genkeypair -v -keystore keystore/your-release.keystore -alias your-alias \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Create `android/keystore.properties`:
   ```properties
   storeFile=../../keystore/your-release.keystore
   storePassword=your-store-password
   keyAlias=your-alias
   keyPassword=your-key-password
   ```
3. Run `./gradlew assembleRelease` from `android/`.

**Keep this keystore safe** — Android requires the *same* signing key to install an update over an existing install. Losing it means you can never update that install again.

### Android permissions

| Permission | Why |
|---|---|
| `INTERNET` | Map tiles, address search, Battery Saver's IP/Wi-Fi location lookups |
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | GPS-based alarm triggering |
| `VIBRATE` | Alarm vibration |

`android:allowBackup` is set to `false` so alarm destinations (potentially home/work addresses) can't be extracted via `adb backup` or Android's cloud auto-backup.

## Native Android vibration

Chromium (and therefore the Android WebView) requires a direct, recent user tap before it will honor the standard `navigator.vibrate()` Web API — but alarms fire automatically from a background geofence check, not a tap, so the browser silently ignores the call. To work around this, vibration goes through a small custom native Capacitor plugin instead:

- `android/app/src/main/java/com/wakeywakey/app/AlarmVibrationPlugin.java` calls Android's `Vibrator`/`VibratorManager` directly with `VibrationEffect.createWaveform(pattern, repeat=0)`, which asks the **OS** to loop the buzz pattern indefinitely — looping happens in the vibration service itself, not via JS timers.
- `src/utils/nativeVibration.ts` is the typed JS-side wrapper (`registerPlugin('AlarmVibration')`).
- `src/utils/audio.ts` calls it on native platforms (`Capacitor.isNativePlatform()`), falling back to the web Vibration API (via `@capacitor/haptics`) only when running in a plain browser for local dev/testing.

## How alarm triggering works

1. `App.tsx` watches the device's location via `navigator.geolocation.watchPosition` (high-accuracy GPS) or, in Battery Saver Mode, periodically polls IP/Wi-Fi-based location.
2. On every location update, a geofencing effect computes the Haversine distance from the current position to each *enabled* alarm's destination.
3. If the distance drops within an alarm's configured radius, that alarm becomes the active `triggeredAlarm`, mounting `AlarmTriggeredScreen` — which starts the looping synthesized tone and native vibration, and disables the alarm once dismissed (or snoozes it for 5 minutes).
4. Alarms are persisted to `localStorage` on every create/update/delete/toggle — no network round-trip.

## Known limitations

- **Foreground-only tracking**: geofence checks run in the app's JavaScript, so they only evaluate while the app is open (foreground or briefly backgrounded). There's no native background service/geofencing API integration (yet), so Android may pause location updates if the app is killed or aggressively backgrounded by battery optimization — this is a common constraint for WebView-based apps and would require a native background service to fully solve.
- **Live map tiles need connectivity**: OpenStreetMap tile images and address search (Nominatim) require internet; GPS tracking, geofence triggering, alarm sound/vibration, and alarm storage do not.
- **OEM battery/app restrictions**: some heavily customized Android skins (MIUI, ColorOS, FuntouchOS, etc.) restrict background behavior per-app by default — you may need to manually allow the app under battery/autostart settings for reliable triggering.
