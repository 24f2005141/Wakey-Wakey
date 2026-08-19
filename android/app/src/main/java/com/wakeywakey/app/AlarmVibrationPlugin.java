package com.wakeywakey.app;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmVibration")
public class AlarmVibrationPlugin extends Plugin {

    // [delay, vibrate, off, vibrate, off, vibrate, off], then looped from index 0
    // by the OS itself — no JS timer needed to keep it going.
    private static final long[] PATTERN = { 0, 400, 200, 400, 200, 800, 300 };

    private Vibrator getVibrator() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager =
                (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vibratorManager != null ? vibratorManager.getDefaultVibrator() : null;
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.reject("Device has no vibrator");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(PATTERN, 0));
        } else {
            vibrator.vibrate(PATTERN, 0);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator != null) {
            vibrator.cancel();
        }
        call.resolve();
    }
}
