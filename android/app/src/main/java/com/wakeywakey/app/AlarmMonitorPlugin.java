package com.wakeywakey.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Bridges the JS alarm list to native background geofence monitoring, so
 * alarms keep firing even when the app isn't open. See README's
 * "Background alarm monitoring" section for the full architecture.
 */
@CapacitorPlugin(
    name = "AlarmMonitor",
    permissions = { @Permission(strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }, alias = "backgroundLocation") }
)
public class AlarmMonitorPlugin extends Plugin {

    /** Called from JS whenever the alarm list changes; re-syncs native geofences. */
    @PluginMethod
    public void syncAlarms(PluginCall call) {
        JSArray alarmsArray = call.getArray("alarms");
        List<NativeAlarmStore.NativeAlarm> alarms = new ArrayList<>();

        if (alarmsArray != null) {
            try {
                for (int i = 0; i < alarmsArray.length(); i++) {
                    JSONObject obj = alarmsArray.getJSONObject(i);
                    alarms.add(
                        new NativeAlarmStore.NativeAlarm(
                            obj.getString("id"),
                            obj.optString("name", "Destination Alarm"),
                            obj.getDouble("lat"),
                            obj.getDouble("lng"),
                            obj.getDouble("radius"),
                            obj.optBoolean("enabled", true),
                            obj.optBoolean("sound", true),
                            obj.optBoolean("vibration", true)
                        )
                    );
                }
            } catch (JSONException e) {
                call.reject("Invalid alarms payload", e);
                return;
            }
        }

        NativeAlarmStore.saveAlarms(getContext(), alarms);
        GeofenceRegistrar.registerAlarms(getContext(), alarms);
        call.resolve();
    }

    /**
     * Called on app launch/resume. Returns (and clears) the alarm id that
     * fired natively while the app wasn't running, if any, so the JS side
     * can show the full alarm screen with sound immediately.
     */
    @PluginMethod
    public void checkPendingTrigger(PluginCall call) {
        String alarmId = NativeAlarmStore.consumePendingTrigger(getContext());
        JSObject result = new JSObject();
        result.put("alarmId", alarmId);
        call.resolve(result);
    }

    @PluginMethod
    public void hasBackgroundLocationPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", isBackgroundLocationGranted());
        call.resolve(result);
    }

    /**
     * On Android 11+ the system will not offer "Allow all the time" from a
     * normal in-app prompt — this can still trigger the initial request, but
     * the caller should fall back to openLocationSettings() if it comes back
     * ungranted.
     */
    @PluginMethod
    public void requestBackgroundLocationPermission(PluginCall call) {
        if (isBackgroundLocationGranted()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("backgroundLocation", call, "backgroundLocationCallback");
    }

    @PermissionCallback
    private void backgroundLocationCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", isBackgroundLocationGranted());
        call.resolve(result);
    }

    /** Opens this app's system settings page so the user can grant "Allow all the time" manually. */
    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private boolean isBackgroundLocationGranted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            // Below Android 10, foreground location permission covers background use too.
            return getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
        return (
            getContext().checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        );
    }
}
