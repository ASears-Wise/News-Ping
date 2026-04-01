#!/usr/bin/env bash
# Download and install news app APKs on all running emulators
# News apps must be sideloaded since emulators may not have Play Store signed in
# This script uses APKPure/APKMirror direct downloads where available,
# otherwise prints manual installation instructions.
set -euo pipefail

export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

APKS_DIR="$HOME/news-apks"
mkdir -p "$APKS_DIR"

# Wait for emulators to be ready
echo "Waiting for emulators to come online..."
TIMEOUT=180
ELAPSED=0
while true; do
    ONLINE=$(adb devices | grep -c "emulator.*device$" || true)
    if [ "$ONLINE" -ge 1 ]; then
        echo "  $ONLINE emulator(s) online"
        break
    fi
    if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
        echo "ERROR: No emulators came online within ${TIMEOUT}s"
        echo "Check: systemctl status 'pushpulse-emu@*'"
        exit 1
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo "  Still waiting... (${ELAPSED}s)"
done

# Extra wait for full boot
echo "Waiting for emulators to fully boot..."
for SERIAL in $(adb devices | grep -E 'emulator-[0-9]+\s+device' | awk '{print $1}'); do
    echo "  Waiting for $SERIAL..."
    adb -s "$SERIAL" wait-for-device
    adb -s "$SERIAL" shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 2; done'
    echo "  $SERIAL is ready"
done

echo ""
echo "=== News App Installation ==="
echo ""
echo "IMPORTANT: The news apps must be installed manually via Google Play Store"
echo "on each emulator, since they require Play Services sign-in."
echo ""
echo "To open Play Store on each emulator, connect via adb and run:"
echo ""

for SERIAL in $(adb devices | grep -E 'emulator-[0-9]+\s+device' | awk '{print $1}'); do
    PORT=$(echo "$SERIAL" | grep -o '[0-9]*$')
    EMU_NUM=$(( (PORT - 5554) / 2 + 1 ))
    echo "  Emulator $EMU_NUM ($SERIAL):"
    echo "    adb -s $SERIAL shell am start -a android.intent.action.VIEW -d 'market://search?q=nytimes'"
    echo ""
done

echo "Apps to install on EACH emulator:"
echo "  - com.nytimes.android      (New York Times)"
echo "  - com.cnn.mobile.android.phone  (CNN)"
echo "  - bbc.mobile.news.ww       (BBC News)"
echo "  - wsj.reader_sp            (Wall Street Journal)"
echo "  - mnn.Android              (AP News)"
echo "  - com.thomsonreuters.reuters (Reuters)"
echo "  - com.washingtonpost.android (Washington Post)"
echo "  - com.foxnews.android      (Fox News)"
echo "  - com.guardian             (The Guardian)"
echo "  - org.npr.one              (NPR News)"
echo ""
echo "After installing, enable push notifications for each app."
echo "Then run: bash ~/news-ping/scripts/install-capture.sh"
