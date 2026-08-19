import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import AlarmVibration from './nativeVibration';

let audioCtx: AudioContext | null = null;
let activeAlarmInterval: number | null = null;
let activeVibrationInterval: number | null = null;
let vibrationTimeouts: number[] = [];

// Buzz pattern: two short pulses then one long one, matching the old
// [400, 200, 400, 200, 800] Web Vibration API pattern. Expressed as
// (delay-from-cycle-start, duration) pairs since Haptics.vibrate() only
// takes a single duration per call, not a pattern array.
const VIBRATION_PULSES: { delay: number; duration: number }[] = [
  { delay: 0, duration: 400 },
  { delay: 600, duration: 400 },
  { delay: 1200, duration: 800 },
];
const VIBRATION_CYCLE_DURATION = 2300;

function fireVibrationPattern() {
  for (const { delay, duration } of VIBRATION_PULSES) {
    const timeoutId = window.setTimeout(() => {
      Haptics.vibrate({ duration }).catch((err) => {
        console.error('[Vibration] Haptics.vibrate failed:', err);
      });
    }, delay);
    vibrationTimeouts.push(timeoutId);
  }
}

function clearVibrationTimeouts() {
  for (const id of vibrationTimeouts) {
    clearTimeout(id);
  }
  vibrationTimeouts = [];
}

/**
 * Start buzzing. On a real Android/iOS build this calls a small custom
 * native plugin (AlarmVibrationPlugin) that asks the OS to loop a waveform
 * pattern forever via VibrationEffect.createWaveform(pattern, repeat=0) —
 * looping happens in the OS's vibration service itself, not via JS timers,
 * so it can't be affected by the WebView's JS thread stuttering or the
 * browser's "requires a user gesture" restriction on navigator.vibrate().
 * In a plain browser (dev/testing only) it falls back to re-firing
 * Haptics.vibrate() (which itself wraps navigator.vibrate() on web) on a
 * JS-side loop.
 */
function startVibration() {
  if (Capacitor.isNativePlatform()) {
    AlarmVibration.start().catch((err) => {
      console.error('[Vibration] Native AlarmVibration.start failed:', err);
    });
    return;
  }
  fireVibrationPattern();
  activeVibrationInterval = window.setInterval(fireVibrationPattern, VIBRATION_CYCLE_DURATION);
}

function stopVibration() {
  if (Capacitor.isNativePlatform()) {
    AlarmVibration.stop().catch((err) => {
      console.error('[Vibration] Native AlarmVibration.stop failed:', err);
    });
    return;
  }
  if (activeVibrationInterval !== null) {
    clearInterval(activeVibrationInterval);
    activeVibrationInterval = null;
  }
  clearVibrationTimeouts();
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a single chime / chord tone
 */
export function playChime(freq = 587.33, duration = 0.8, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Bell-like decay envelope
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error('Audio playback error:', e);
  }
}

/**
 * Play an alarm sequence (melody chords)
 */
export function playAlarmSequence(tone: string = 'gentle_chime', volume = 0.4) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (tone === 'station_bell') {
      // Classic 2-tone airport / station chime (Ding-Dong)
      const freqs = [659.25, 523.25]; // E5, C5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.4);

        gain.gain.setValueAtTime(0, now + idx * 0.4);
        gain.gain.linearRampToValueAtTime(volume, now + idx * 0.4 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.4 + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.4);
        osc.stop(now + idx * 0.4 + 0.9);
      });
    } else if (tone === 'urgency_pulse') {
      // Modern rhythmic pulse
      const freqs = [880, 880, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0, now + idx * 0.18);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + idx * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.16);
      });
    } else if (tone === 'subway_alert') {
      // Warm 3-tone subway / metro arrival chime (G4, C5, E5)
      const freqs = [392.00, 523.25, 659.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.22);

        gain.gain.setValueAtTime(0, now + idx * 0.22);
        gain.gain.linearRampToValueAtTime(volume, now + idx * 0.22 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 0.85);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.22);
        osc.stop(now + idx * 0.22 + 0.85);
      });
    } else {
      // Default: Gentle Wake Chime (Arpeggio: C5 -> E5 -> G5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0, now + idx * 0.16);
        gain.gain.linearRampToValueAtTime(volume, now + idx * 0.16 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.8);
      });
    }
  } catch (e) {
    console.error('Audio sequence error:', e);
  }
}

/**
 * Start looping alarm sound + vibration
 */
export function startAlarmSound(sound = true, vibration = true, tone = 'gentle_chime') {
  stopAlarmSound();

  if (sound) {
    playAlarmSequence(tone);
    activeAlarmInterval = window.setInterval(() => {
      playAlarmSequence(tone);
    }, 1800);
  }

  if (vibration) {
    startVibration();
  }
}

/**
 * Stop alarm audio and vibration
 */
export function stopAlarmSound() {
  if (activeAlarmInterval !== null) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
  stopVibration();
}
