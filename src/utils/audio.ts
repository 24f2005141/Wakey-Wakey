let audioCtx: AudioContext | null = null;
let activeAlarmInterval: number | null = null;

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

  if (vibration && 'vibrate' in navigator) {
    try {
      navigator.vibrate([400, 200, 400, 200, 800]);
    } catch {
      // ignore
    }
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
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
}
