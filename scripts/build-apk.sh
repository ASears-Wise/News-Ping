#!/usr/bin/env bash
# Build capture APKs for each emulator (each has a unique EMULATOR_ID)
# Run as the pushpulse user on the VPS after Android SDK is set up
set -euo pipefail

export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:/opt/gradle/gradle-8.4/bin:$PATH"

REPO_DIR="$HOME/news-ping"
APK_DIR="$REPO_DIR/apps/android-capture"
OUTPUT_DIR="$HOME/apks"
mkdir -p "$OUTPUT_DIR"

# Ensure local.properties exists with sdk.dir (required by Android Gradle Plugin)
echo "sdk.dir=$ANDROID_HOME" > "$APK_DIR/local.properties"

echo "=== Building NewsPing Capture APKs ==="

for EMU_NUM in 1 2 3; do
    EMU_ID="emu-$EMU_NUM"
    echo ""
    echo "Building APK for $EMU_ID..."

    # Patch Config.java with the correct emulator ID
    CONFIG_FILE="$APK_DIR/app/src/main/java/com/pushpulse/capture/Config.java"
    sed -i "s/public static final String EMULATOR_ID = \"[^\"]*\"/public static final String EMULATOR_ID = \"$EMU_ID\"/" "$CONFIG_FILE"

    # Build debug APK
    cd "$APK_DIR"
    gradle assembleDebug --quiet

    # Copy output with emulator-specific name
    cp "app/build/outputs/apk/debug/app-debug.apk" "$OUTPUT_DIR/capture-$EMU_ID.apk"
    echo "  Built: $OUTPUT_DIR/capture-$EMU_ID.apk"
done

# Restore Config.java to emu-1 as default
sed -i "s/public static final String EMULATOR_ID = \"[^\"]*\"/public static final String EMULATOR_ID = \"emu-1\"/" \
    "$APK_DIR/app/src/main/java/com/pushpulse/capture/Config.java"

echo ""
echo "=== APK build complete ==="
echo "APKs saved to: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
