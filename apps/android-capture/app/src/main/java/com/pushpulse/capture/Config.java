package com.pushpulse.capture;

import java.util.HashMap;
import java.util.Map;

public class Config {
    // Set via build config or environment
    public static final String API_URL = "https://api.newsping.io/api/ingest";
    public static final String API_KEY = "eaf0493ca5d268ece01479167a1c9efb8cf4c637521c4806554baa9c307cfd6c";
    public static final String EMULATOR_ID = "emu-1";
    public static final int HEARTBEAT_INTERVAL_MS = 60_000;
    public static final int MAX_RETRY_ATTEMPTS = 5;
    public static final long RETRY_BASE_DELAY_MS = 1_000;

    // Map of Android package names to PushPulse source IDs
    public static final Map<String, String> TRACKED_PACKAGES = new HashMap<>();
    static {
        TRACKED_PACKAGES.put("com.nytimes.android", "nyt");
        TRACKED_PACKAGES.put("com.cnn.mobile.android.phone", "cnn");
        TRACKED_PACKAGES.put("bbc.mobile.news.ww", "bbc");
        TRACKED_PACKAGES.put("wsj.reader_sp", "wsj");
        TRACKED_PACKAGES.put("mnn.Android", "ap");
        TRACKED_PACKAGES.put("com.thomsonreuters.reuters", "reuters");
        TRACKED_PACKAGES.put("com.washingtonpost.android", "wapo");
        TRACKED_PACKAGES.put("com.foxnews.android", "fox");
        TRACKED_PACKAGES.put("com.guardian", "guardian");
        TRACKED_PACKAGES.put("org.npr.one", "npr");
    }
}
