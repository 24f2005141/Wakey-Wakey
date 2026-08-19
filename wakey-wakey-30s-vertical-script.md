# Wakey Wakey — 30s Vertical Promo (v2, revised against real app builds)
**Format:** 9:16 · 1080×1920 · 30 seconds · hybrid (real screen captures + rebuilt motion-graphics UI over live-action plates) · no voiceover — on-screen text, music, SFX

> **v2 changes:** corrected against actual app screenshots. Radius range fixed to 100m–5km. Real tone names used. Category icons removed (app uses circular map thumbnails). Frame architecture added to handle the 5:8 capture / 9:16 delivery mismatch. Map is dark — confirmed shipping.

---

## Frame architecture

Every capture you have is ~999×1599 (≈5:8). Delivery is 1080×1920 (9:16). Do not crop to fit — it clips the two-column New Alarm modal and the side-by-side alarm cards.

**Two frame modes, used deliberately:**

### Mode A — Device Card (for all real captures)
```
┌─────────────────────┐  1080×1920, #0b0106 full bleed
│   [Fraunces line]   │  ← ~290px type zone
│  ┌───────────────┐  │
│  │               │  │  ← capture, 860×1376, centered
│  │   real UI     │  │     16px radius, 1px rose border @ 20%
│  │               │  │     soft maroon glow, 40px blur
│  └───────────────┘  │
│   [Space Mono]      │  ← ~250px data zone
└─────────────────────┘
```
Lock these numbers once and never vary them — the card must sit in the identical position every time it appears, so cuts between UI shots feel like one continuous device.

### Mode B — Full Bleed (rebuilt UI only)
Used twice: the tracking map (Shot 8) and the alarm screen (Shot 10). Rebuilt at native 1080×1920 in After Effects. Both are simple enough to reconstruct exactly — a dark map with a dot and a ring; type on a solid field.

---

## Design system (verified from build)

| Element | Spec |
|---|---|
| Background | `#0b0106` near-black maroon |
| Primary accent | Rose/pink — bright for toggles & active states, deep maroon for filled buttons |
| Display type | Fraunces — "My Alarms", "Settings", "Wakey Wakey", all text cards |
| UI type | Plus Jakarta Sans — buttons, labels, destination names |
| Data type | Space Mono — distance, coordinates, radius, tone tags, all readouts |
| Map | **Dark tiles** (shipping build) |
| Location dot | Ringed dot, rose center |
| Geofence | Single rose circle + dashed line from current location to pin |
| Radius range | **100m – 5km** ← not 50m–50km |
| Tones | Gentle Wake Arpeggio · Transit Station Bell · **Subway Arrival Chime** · Urgent Transit Pulse |

**Text card rule:** max 5 words, Fraunces, hard cut in on the beat, no fades. Keep 12% safe margins top and bottom for social UI chrome.

---

## PRE-SHOOT: seed the app

Before capturing anything, populate the device so nothing truncates or looks empty.

- [ ] Create alarms with **short names that fit on one line**: `Central Station`, `Home`, `Terminal 2`. The current build truncates to "Internationa…" / "Central Rail…" and that reads as a bug in a hero shot.
- [ ] Have **3 alarms active**, not 1 — the alarm list shot needs to look inhabited. Kill the "1 Active Alarms" grammar bug before capture if you can.
- [ ] Set the hero alarm to **500m radius, Subway Arrival Chime, sound + vibrate on**.
- [ ] Record the real **Subway Arrival Chime** audio via the play button in Settings. This is your alarm sound — do not substitute a library SFX.
- [ ] Capture the alarm screen using **Settings → Test Fullscreen Alarm**, as reference for the Mode B rebuild.
- [ ] Confirm the live distance readout is visible and legible on the tracking view; capture a real approach if possible for timing reference.

---

## ACT 1 — THE FAILURE (0:00–0:05)

### Shot 1 · 0:00–0:02 · plate
Close on a commuter asleep against a bus/train window, headphones in, night city smearing past. Handheld, carrying the vehicle's vibration. Sodium streetlight raking across the face in intervals.
**Sound:** Muffled low-end rumble. No music yet.

### Shot 2 · 0:02–0:04 · plate
The jolt. Eyes snap open. Whip-pan to the window — an unfamiliar stop sliding *away*. Hand grabs the seat back.
**Sound:** Rumble cuts to near-silence for 3 frames on the eye-open, then a door hiss.

### Shot 3 · 0:04–0:05 · text card
Black field.
**Text:** `Three stops too late.`
**Sound:** Low sub-drop. Music enters on the last frame.

---

## ACT 2 — THE SETUP (0:05–0:13)

### Shot 4 · 0:05–0:07 · plate
Same commuter, another night, boarding and sitting down calm. Thumb comes up to the phone. Compose with the phone lower-third — it's a light source and a gesture here, not something we read.
**Text:** `Set a place, not a time.` — upper third, over the plate.
**Sound:** Music finds its pulse.

### Shot 5 · 0:07–0:10 · **Mode A** — New Alarm capture
Real capture of the New Alarm screen. Animate *within* the card: pin drops on the mini map, rose geofence circle blooms, dashed line draws from the blue current-location dot to the pin, radius slider handle travels.
**Card overlay:** `Central Station` types into the Destination Name field.
**Below card, Space Mono:** `TRIGGER RADIUS 500m`
**Sound:** Pin-drop thunk. Rising whoosh on the circle bloom.

### Shot 6 · 0:10–0:12 · **Mode A** — tone selection
Same card position. The 2×2 tone grid. `Subway Chime` row gets its check and rose highlight. Sound and Vibrate toggles flick on.
**Sound:** **One second of the real Subway Arrival Chime.** This is the plant — everything at 0:19 pays it off.

### Shot 7 · 0:12–0:13 · **Mode A** → plate
`SAVE ALARM` — the big rose button — is pressed. Fills, confirms.
Hard cut to plate: phone goes in pocket, commuter leans on window, eyes close. Relaxed, not anxious.
**Sound:** Confirmation chime. Music opens up.

---

## ACT 3 — THE PAYOFF (0:13–0:24)

### Shot 8 · 0:13–0:18 · **Mode B** — the centerpiece
Full-bleed rebuilt dark map. Rose location dot glides toward the ringed pin, map drifting under it. One continuous compressed move — no cuts inside this shot.
**Readout (Space Mono, upper area, matching the app's real display):** `1.2 km` → `840 m` → `520 m`
**Intercut:** two 6-frame flashes of the sleeping commuter, phone dark on their lap. Proves it's working while they're out.
**Text:** `You sleep. It watches.` — low third, holds ~1.5s.
**Sound:** Music builds. Faint tick synced to each distance step.

### Shot 9 · 0:18–0:19 · **Mode B** — the cross
Dot touches the ring. Ring flares and collapses inward.
**Readout:** `120 m` → `ARRIVING`
**Sound:** **Music drops out entirely for ~8 frames.** Do not let a bed run through this.

### Shot 10 · 0:19–0:21 · plate + **Mode B**
**Plate:** Phone screen ignites in the dark carriage — real light spilling onto the commuter's face and the seat back, phone visibly buzzing against fabric.
**Screen (rebuilt full-bleed, matching Test Fullscreen Alarm):** `Wake Up!` huge in Fraunces on `#0b0106`, `Central Station` beneath in Plus Jakarta Sans, screen edge pulsing with the vibration.
**Sound:** The Subway Arrival Chime — identical asset to 0:11. Haptic buzz under it. Music slams back.

### Shot 11 · 0:21–0:24 · plate
Eyes open calm, not startled. Thumb dismisses. They gather their bag unhurried, stand, step off onto the platform. Final beat: a small relieved half-smile, breath in cold air, doors closing behind.
No UI. This is the emotional shot — keep it clean.
**Text:** `Your stop. Every time.`
**Sound:** Full music. Door chime, footsteps on platform.

---

## ACT 4 — FEATURE FLASH (0:24–0:27)

Three **Mode A** cuts, ~1 second each, hard cuts on the beat. Card stays locked in position so it reads as one device being scrolled.

| Time | Real capture + animation | Text below card (Space Mono) |
|---|---|---|
| 0:24–0:25 | Settings. Battery Saver toggle flips on → selection moves from **High Precision GPS** to **Internet / Network** → chip in the corner changes off "High Accuracy GPS". Battery glyph holds full. | `GPS off. Still tracking.` |
| 0:25–0:26 | My Alarms. Three cards with circular map thumbnails — Central Station, Home, Terminal 2 — each showing its radius and tone tag. | `Three alarms. All at once.` |
| 0:26–0:27 | New Alarm. Radius slider dragged across its full travel, circle expanding on the mini map. | `100 m to 5 km.` |

> The category-icon language from the brief (bus/briefcase/house/plane) **does not exist in the build** — the app uses circular map-snippet thumbnails instead. Shoot what's there; the thumbnails are the better visual anyway.

---

## ACT 5 — CLOSE (0:27–0:30)

### Shot 12 · 0:27–0:30
Solid `#0b0106`. App icon settles center, a single rose geofence ring pulsing outward from behind it and dissipating past the frame edge. `Wakey Wakey` wordmark in Fraunces below.
**Text:** `Never miss your stop again.` then bottom: `Download now` + Play Store badge.
**Sound:** Music resolves. Soft final pulse tone.

---

## Production notes

**Plates needed** (one performer, two locations, all night/dusk):
1. Sleeping commuter, window seat
2. The jolt / wrong stop reaction
3. Boarding, sitting, phone in hand
4. Phone igniting in a dark carriage — shoot the phone as a *light source*, screen replaced in post
5. Step-off onto platform

**Chennai advantage:** the app's map data is real Ambattur / Maduravoyal geography. If you shoot plates locally the map and the window match, which almost no app promo gets to claim.

**The three things doing the persuading:**
- The chime at 0:11 and 0:19 must be the identical file. That callback sells "it actually works" for free.
- The silence at 0:18–0:19 is the most important second in the cut.
- Shot 11 is the only shot with no UI at all, and it's the one that makes anyone download the app.

**15s cut, if needed later:** keep shots 2, 3, 5, 8, 9, 10, 12. Act 2's tone selection and the whole feature flash are what compress.
