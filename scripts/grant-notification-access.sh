#!/usr/bin/env bash
# Grant notification listener permission to PushPulse Capture on all connected emulators
set -euo pipefail

COMPONENT="com.pushpulse.capture/com.pushpulse.capture.NotificationCaptureService"

for SERIAL in $(adb devices | grep -E 'emulator-\d+' | awk '{print $1}'); do
    echo "Granting notification access on $SERIAL..."
    adb -s "$SERIAL" shell cmd notification allow_listener "$COMPONENT"
    echo "  Done."
done

echo "Notification access granted on all emulators."
