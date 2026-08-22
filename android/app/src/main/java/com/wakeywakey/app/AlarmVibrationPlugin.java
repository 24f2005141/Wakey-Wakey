package com.wakeywakey.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmVibration")
public class AlarmVibrationPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        VibrationHelper.start(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        VibrationHelper.stop(getContext());
        call.resolve();
    }
}
