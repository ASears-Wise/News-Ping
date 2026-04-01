package com.pushpulse.capture;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.TextView;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        TextView tv = new TextView(this);
        tv.setPadding(32, 32, 32, 32);
        tv.setTextSize(16);
        tv.setText("PushPulse Capture Service\n\n" +
                "Emulator ID: " + Config.EMULATOR_ID + "\n" +
                "Tracking " + Config.TRACKED_PACKAGES.size() + " apps\n\n" +
                "Ensure Notification Access is granted for this app.\n" +
                "The capture service runs automatically in the background.");
        setContentView(tv);

        // Prompt notification access if not already granted
        if (!isNotificationServiceEnabled()) {
            startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        }
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getPackageName();
        String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return flat != null && flat.contains(pkgName);
    }
}
