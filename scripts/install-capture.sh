#!/usr/bin/env bash
# Install PushPulse Capture APK on all connected emulators
set -euo pipefail

APK_PATH="${1:-apps/android-capture/app/build/outputs/apk/release/app-release.apk}"

if [ ! -f "$APK_PATH" ]; then
    echo "APK not found at: $APK_PATH"
    echo "Build it first: cd apps/android-capture && ./gradlew assembleRelease"
    exit 1
fi

for SERIAL in $(adb devices | grep -E 'emulator-\d+' | awk '{print $1}'); do
    echo "Installing on $SERIAL..."
    adb -s "$SERIAL" install -r "$APK_PATH"
    echo "  Done."
done

echo "Capture APK installed on all emulators."
