package com.wakeywakey.app;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

import java.util.ArrayList;
import java.util.List;

/**
 * Registers/re-registers Google Play Services geofences for the current
 * enabled alarm set. Shared by AlarmMonitorPlugin.syncAlarms() (called from
 * JS whenever the alarm list changes) and BootCompletedReceiver (geofences
 * don't survive a device reboot).
 */
public class GeofenceRegistrar {

    public static void registerAlarms(Context context, List<NativeAlarmStore.NativeAlarm> alarms) {
        if (
            ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED
        ) {
            return;
        }

        GeofencingClient client = LocationServices.getGeofencingClient(context);

        // Clear everything previously registered, then re-add the current
        // enabled set. Simpler and safer than diffing an unbounded id set.
        client
            .removeGeofences(getPendingIntent(context))
            .addOnCompleteListener(task -> {
                List<Geofence> geofences = new ArrayList<>();
                for (NativeAlarmStore.NativeAlarm alarm : alarms) {
                    if (!alarm.enabled) continue;
                    geofences.add(
                        new Geofence.Builder()
                            .setRequestId(alarm.id)
                            .setCircularRegion(alarm.lat, alarm.lng, (float) Math.max(50, alarm.radius))
                            .setExpirationDuration(Geofence.NEVER_EXPIRE)
                            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                            .build()
                    );
                }

                if (geofences.isEmpty()) return;

                GeofencingRequest request = new GeofencingRequest.Builder()
                    .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                    .addGeofences(geofences)
                    .build();

                try {
                    client.addGeofences(request, getPendingIntent(context));
                } catch (SecurityException e) {
                    // Missing ACCESS_BACKGROUND_LOCATION (or fine location was revoked) —
                    // geofences silently won't fire while the app is backgrounded.
                }
            });
    }

    public static void reregisterAll(Context context) {
        registerAlarms(context, NativeAlarmStore.loadAlarms(context));
    }

    private static PendingIntent getPendingIntent(Context context) {
        Intent intent = new Intent(context, GeofenceBroadcastReceiver.class);
        // Geofencing requires FLAG_MUTABLE: Play Services attaches the
        // GeofencingEvent data to this intent when it delivers the broadcast.
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
    }
}
