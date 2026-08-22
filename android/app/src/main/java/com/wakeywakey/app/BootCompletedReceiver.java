package com.wakeywakey.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Re-registers geofences after a reboot, since they don't persist across one. */
public class BootCompletedReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            GeofenceRegistrar.reregisterAll(context);
        }
    }
}
