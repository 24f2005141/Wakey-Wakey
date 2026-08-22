package com.wakeywakey.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmVibrationPlugin.class);
        registerPlugin(AlarmMonitorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
