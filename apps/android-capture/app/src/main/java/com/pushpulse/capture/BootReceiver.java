package com.pushpulse.capture;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Ensures the notification listener service restarts after device boot.
 * The system automatically binds NotificationListenerService after boot
 * if notification access is granted, but this receiver logs the event
 * for debugging.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.i("PushPulseCapture", "Boot completed — notification listener will be bound by system");
        }
    }
}
