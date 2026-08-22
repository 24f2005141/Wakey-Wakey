package com.wakeywakey.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Persists the current alarm list (mirrored from JS on every change) and a
 * "pending trigger" flag, so a geofence event received while the WebView
 * isn't running can still be picked up once the app is opened again.
 */
public class NativeAlarmStore {
    private static final String PREFS_NAME = "wakey_wakey_native_alarms";
    private static final String KEY_ALARMS_JSON = "alarms_json";
    private static final String KEY_PENDING_TRIGGER_ID = "pending_trigger_alarm_id";

    public static class NativeAlarm {
        public final String id;
        public final String name;
        public final double lat;
        public final double lng;
        public final double radius;
        public final boolean enabled;
        public final boolean sound;
        public final boolean vibration;

        public NativeAlarm(
            String id,
            String name,
            double lat,
            double lng,
            double radius,
            boolean enabled,
            boolean sound,
            boolean vibration
        ) {
            this.id = id;
            this.name = name;
            this.lat = lat;
            this.lng = lng;
            this.radius = radius;
            this.enabled = enabled;
            this.sound = sound;
            this.vibration = vibration;
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static void saveAlarms(Context context, List<NativeAlarm> alarms) {
        JSONArray arr = new JSONArray();
        for (NativeAlarm a : alarms) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", a.id);
                obj.put("name", a.name);
                obj.put("lat", a.lat);
                obj.put("lng", a.lng);
                obj.put("radius", a.radius);
                obj.put("enabled", a.enabled);
                obj.put("sound", a.sound);
                obj.put("vibration", a.vibration);
                arr.put(obj);
            } catch (JSONException e) {
                // skip malformed entry
            }
        }
        prefs(context).edit().putString(KEY_ALARMS_JSON, arr.toString()).apply();
    }

    public static List<NativeAlarm> loadAlarms(Context context) {
        List<NativeAlarm> result = new ArrayList<>();
        String json = prefs(context).getString(KEY_ALARMS_JSON, "[]");
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                result.add(
                    new NativeAlarm(
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
            // return whatever was parsed before the error
        }
        return result;
    }

    public static NativeAlarm findAlarm(Context context, String id) {
        if (id == null) return null;
        for (NativeAlarm a : loadAlarms(context)) {
            if (a.id.equals(id)) return a;
        }
        return null;
    }

    public static void setPendingTrigger(Context context, String alarmId) {
        prefs(context).edit().putString(KEY_PENDING_TRIGGER_ID, alarmId).apply();
    }

    /** Reads and clears the pending trigger in one call, so it's only ever consumed once. */
    public static String consumePendingTrigger(Context context) {
        SharedPreferences p = prefs(context);
        String id = p.getString(KEY_PENDING_TRIGGER_ID, null);
        if (id != null) {
            p.edit().remove(KEY_PENDING_TRIGGER_ID).apply();
        }
        return id;
    }
}
