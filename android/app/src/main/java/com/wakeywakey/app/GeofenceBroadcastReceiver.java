package com.wakeywakey.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingEvent;

import java.util.List;

/**
 * Invoked directly by Google Play Services when a registered geofence is
 * entered — including when the app process has been killed. Since this only
 * needs to do a few quick, synchronous things (start vibrating, post a
 * notification, remember which alarm fired), it's handled right here instead
 * of spinning up a full foreground Service.
 */
public class GeofenceBroadcastReceiver extends BroadcastReceiver {

    private static final String CHANNEL_ID = "wakey_wakey_alarm_channel";

    @Override
    public void onReceive(Context context, Intent intent) {
        GeofencingEvent geofencingEvent = GeofencingEvent.fromIntent(intent);
        if (geofencingEvent == null || geofencingEvent.hasError()) {
            return;
        }

        if (geofencingEvent.getGeofenceTransition() != Geofence.GEOFENCE_TRANSITION_ENTER) {
            return;
        }

        List<Geofence> triggeringGeofences = geofencingEvent.getTriggeringGeofences();
        if (triggeringGeofences == null || triggeringGeofences.isEmpty()) {
            return;
        }

        // Briefly hold the CPU awake so the notification/vibration calls
        // below reliably complete even if the device was in Doze.
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WakeyWakey:GeofenceWakeLock");
            wakeLock.acquire(20000);
        }

        try {
            String alarmId = triggeringGeofences.get(0).getRequestId();
            NativeAlarmStore.NativeAlarm alarm = NativeAlarmStore.findAlarm(context, alarmId);
            String alarmName = alarm != null ? alarm.name : "your destination";
            boolean shouldVibrate = alarm == null || alarm.vibration;

            NativeAlarmStore.setPendingTrigger(context, alarmId);

            if (shouldVibrate) {
                VibrationHelper.start(context);
            }

            showNotification(context, alarmId, alarmName);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }

    private void showNotification(Context context, String alarmId, String alarmName) {
        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Destination Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts when you reach a saved destination");
            // We drive vibration ourselves with our own looping pattern.
            channel.enableVibration(false);
            notificationManager.createNotificationChannel(channel);
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        launchIntent.putExtra("triggered_alarm_id", alarmId);

        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            alarmId.hashCode(),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Wakey Wakey!")
            .setContentText("Destination reached: " + alarmName)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setOngoing(true)
            .setFullScreenIntent(contentIntent, true)
            .setContentIntent(contentIntent);

        notificationManager.notify(alarmId.hashCode(), builder.build());
    }
}
