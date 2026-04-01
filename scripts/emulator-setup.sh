#!/usr/bin/env bash
# Emulator setup script for Hetzner VPS (Ubuntu 24.04)
# Run once to set up the Android emulator infrastructure
set -euo pipefail

echo "=== PushPulse Emulator Setup ==="

# Install dependencies
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk unzip wget cpu-checker

# Check KVM support
if ! kvm-ok 2>/dev/null; then
    echo "WARNING: KVM not available. Emulators will run slowly without hardware acceleration."
fi

# Install Android SDK command-line tools
ANDROID_HOME="$HOME/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "Downloading Android command-line tools..."
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O /tmp/cmdline-tools.zip
    unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools
    mv /tmp/cmdline-tools/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
    rm /tmp/cmdline-tools.zip
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Accept licenses
yes | sdkmanager --licenses || true

# Install SDK components
sdkmanager "platform-tools" "emulator" "platforms;android-33" "system-images;android-33;google_apis;x86_64"

# Create AVDs (3 emulators)
for i in 1 2 3; do
    AVD_NAME="pushpulse-emu-$i"
    if ! avdmanager list avd | grep -q "$AVD_NAME"; then
        echo "Creating AVD: $AVD_NAME"
        echo "no" | avdmanager create avd \
            -n "$AVD_NAME" \
            -k "system-images;android-33;google_apis;x86_64" \
            -d "pixel_6" \
            --force
    fi
done

# Add to shell profile
cat >> "$HOME/.bashrc" << 'PROFILE'
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
PROFILE

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Copy systemd units: sudo cp scripts/pushpulse-emu@.service /etc/systemd/system/"
echo "  2. Enable emulators: sudo systemctl enable --now pushpulse-emu@{1,2,3}"
echo "  3. Install news apps on each emulator"
echo "  4. Grant notification access: ./scripts/grant-notification-access.sh"
echo "  5. Install capture APK: ./scripts/install-capture.sh"
