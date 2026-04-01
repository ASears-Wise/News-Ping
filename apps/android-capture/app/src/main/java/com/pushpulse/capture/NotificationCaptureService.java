package com.pushpulse.capture;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class NotificationCaptureService extends NotificationListenerService {
    private static final String TAG = "PushPulseCapture";
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private ScheduledExecutorService heartbeatScheduler;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "Notification listener connected");
        startHeartbeat();
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.w(TAG, "Notification listener disconnected");
        stopHeartbeat();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        String sourceId = Config.TRACKED_PACKAGES.get(packageName);

        if (sourceId == null) {
            return; // Not a tracked app
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;

        String title = extras.getString(Notification.EXTRA_TITLE, "");
        String body = extras.getString(Notification.EXTRA_TEXT, "");
        String bigText = extras.getString(Notification.EXTRA_BIG_TEXT, "");
        String channelId = notification.getChannelId();

        if (title.isEmpty()) {
            return; // Skip empty notifications
        }

        // Extract deep link
        String deepLink = null;
        if (notification.contentIntent != null) {
            // Can't easily extract the URI from PendingIntent, but we log what we can
        }

        // Build extras JSON
        JSONObject rawExtras = new JSONObject();
        try {
            rawExtras.put("channel_id", channelId);
            rawExtras.put("package", packageName);
            rawExtras.put("category", notification.category);
            rawExtras.put("priority", notification.priority);
            if (sbn.getTag() != null) rawExtras.put("tag", sbn.getTag());
        } catch (Exception e) {
            Log.e(TAG, "Error building extras JSON", e);
        }

        String receivedAt = getISOTimestamp();

        executor.submit(() -> sendNotification(sourceId, title, body, bigText, channelId, rawExtras, receivedAt));
    }

    private void sendNotification(String sourceId, String title, String body, String bigText,
                                   String channelId, JSONObject rawExtras, String receivedAt) {
        for (int attempt = 0; attempt < Config.MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("source_id", sourceId);
                payload.put("title", title);
                if (!body.isEmpty()) payload.put("body", body);
                if (!bigText.isEmpty()) payload.put("big_text", bigText);
                if (channelId != null) payload.put("android_channel", channelId);
                payload.put("raw_extras", rawExtras);
                payload.put("received_at", receivedAt);

                int status = postJSON(Config.API_URL + "/notification", payload);

                if (status == 201 || status == 200) {
                    Log.i(TAG, "Sent notification: [" + sourceId + "] " + title);
                    return;
                }

                Log.w(TAG, "API returned status " + status + " for: " + title);
                if (status >= 400 && status < 500) {
                    return; // Don't retry client errors
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to send notification (attempt " + (attempt + 1) + ")", e);
            }

            // Exponential backoff
            try {
                long delay = Config.RETRY_BASE_DELAY_MS * (1L << attempt);
                Thread.sleep(delay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        Log.e(TAG, "Exhausted retries for notification: " + title);
    }

    private void startHeartbeat() {
        heartbeatScheduler = Executors.newSingleThreadScheduledExecutor();
        heartbeatScheduler.scheduleAtFixedRate(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("emulator_id", Config.EMULATOR_ID);

                org.json.JSONArray sources = new org.json.JSONArray();
                for (String sourceId : Config.TRACKED_PACKAGES.values()) {
                    sources.put(sourceId);
                }
                payload.put("sources", sources);

                int status = postJSON(Config.API_URL + "/heartbeat", payload);
                Log.d(TAG, "Heartbeat sent, status: " + status);
            } catch (Exception e) {
                Log.e(TAG, "Heartbeat failed", e);
            }
        }, 0, Config.HEARTBEAT_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }

    private void stopHeartbeat() {
        if (heartbeatScheduler != null) {
            heartbeatScheduler.shutdown();
        }
    }

    private int postJSON(String urlStr, JSONObject json) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + Config.API_KEY);
        conn.setDoOutput(true);
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(10_000);

        byte[] data = json.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(data);
        }

        int status = conn.getResponseCode();
        conn.disconnect();
        return status;
    }

    private String getISOTimestamp() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }
}
