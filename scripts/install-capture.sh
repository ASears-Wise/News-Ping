#!/usr/bin/env bash
# Install NewsPing Capture APK on all connected emulators
# Each emulator gets its own APK with a unique EMULATOR_ID
set -euo pipefail

export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

APKS_DIR="${1:-$HOME/apks}"

if [ ! -d "$APKS_DIR" ]; then
    echo "APK directory not found: $APKS_DIR"
    echo "Run build-apk.sh first."
    exit 1
fi

EMULATORS=($(adb devices | grep -E 'emulator-[0-9]+\s+device' | awk '{print $1}'))

if [ ${#EMULATORS[@]} -eq 0 ]; then
    echo "No emulators connected. Start them first: systemctl start 'pushpulse-emu@{1,2,3}'"
    exit 1
fi

echo "=== Installing Capture APK ==="

EMU_IDX=0
for SERIAL in "${EMULATORS[@]}"; do
    EMU_NUM=$((EMU_IDX + 1))
    APK="$APKS_DIR/capture-emu-${EMU_NUM}.apk"

    if [ ! -f "$APK" ]; then
        echo "WARNING: APK not found for emu-$EMU_NUM at $APK — skipping $SERIAL"
        EMU_IDX=$((EMU_IDX + 1))
        continue
    fi

    echo "Installing capture-emu-${EMU_NUM}.apk on $SERIAL..."
    adb -s "$SERIAL" install -r "$APK"
    echo "  Done."
    EMU_IDX=$((EMU_IDX + 1))
done

echo ""
echo "Capture APK installed. Run grant-notification-access.sh next."
