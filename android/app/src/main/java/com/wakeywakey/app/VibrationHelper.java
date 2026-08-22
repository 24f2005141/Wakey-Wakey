package com.wakeywakey.app;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

/**
 * Shared native vibration logic used both by AlarmVibrationPlugin (while the
 * app is in the foreground and JS is driving the alarm screen) and by
 * GeofenceBroadcastReceiver (to start buzzing immediately when a geofence is
 * entered, even before the WebView has booted).
 */
public class VibrationHelper {

    // [delay, vibrate, off, vibrate, off, vibrate, off], looped from index 0
    // by the OS itself via VibrationEffect's repeat index — no JS/native
    // timer needs to keep re-triggering it.
    private static final long[] PATTERN = { 0, 400, 200, 400, 200, 800, 300 };

    public static Vibrator getVibrator(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager =
                (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vibratorManager != null ? vibratorManager.getDefaultVibrator() : null;
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    public static void start(Context context) {
        Vibrator vibrator = getVibrator(context);
        if (vibrator == null || !vibrator.hasVibrator()) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(PATTERN, 0));
        } else {
            vibrator.vibrate(PATTERN, 0);
        }
    }

    public static void stop(Context context) {
        Vibrator vibrator = getVibrator(context);
        if (vibrator != null) {
            vibrator.cancel();
        }
    }
}
