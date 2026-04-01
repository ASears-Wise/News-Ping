#!/usr/bin/env bash
# Emulator setup script for Hetzner VPS (Ubuntu 24.04)
# Run once as root (or with sudo) to set up the Android emulator infrastructure
set -euo pipefail

REPO_URL="${1:-https://github.com/ASears-Wise/News-Ping.git}"
INSTALL_USER="${2:-pushpulse}"

echo "=== NewsPing Emulator Setup ==="
echo "Repo: $REPO_URL"
echo "User: $INSTALL_USER"

# Create dedicated user if not exists
if ! id "$INSTALL_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$INSTALL_USER"
    echo "Created user: $INSTALL_USER"
fi

# Install system dependencies
apt-get update
apt-get install -y \
    openjdk-17-jdk \
    unzip wget curl git \
    cpu-checker \
    libpulse0 libgl1 libnss3 libgbm1

# Check KVM support
if kvm-ok 2>/dev/null; then
    echo "KVM available - emulators will run with hardware acceleration"
    usermod -aG kvm "$INSTALL_USER"
else
    echo "WARNING: KVM not available. Performance may be degraded."
fi

# Install Gradle 8.4
GRADLE_VERSION="8.4"
if [ ! -d "/opt/gradle/gradle-${GRADLE_VERSION}" ]; then
    echo "Installing Gradle ${GRADLE_VERSION}..."
    wget -q "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" -O /tmp/gradle.zip
    mkdir -p /opt/gradle
    unzip -q /tmp/gradle.zip -d /opt/gradle
    rm /tmp/gradle.zip
fi
ln -sf "/opt/gradle/gradle-${GRADLE_VERSION}/bin/gradle" /usr/local/bin/gradle

# Run the rest as the install user
sudo -u "$INSTALL_USER" bash -s "$INSTALL_USER" "$REPO_URL" << 'USERSCRIPT'
INSTALL_USER="$1"
REPO_URL="$2"
set -euo pipefail
cd "$HOME"

ANDROID_HOME="$HOME/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

# Install Android command-line tools
if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "Downloading Android command-line tools..."
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O /tmp/cmdline-tools.zip
    unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools
    mv /tmp/cmdline-tools/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
    rm /tmp/cmdline-tools.zip
fi

export ANDROID_HOME
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Accept licenses and install SDK components
yes | sdkmanager --licenses || true
sdkmanager "platform-tools" "emulator" "platforms;android-33" "build-tools;33.0.2" "system-images;android-33;google_apis;x86_64"

# Create 3 AVDs
for i in 1 2 3; do
    AVD_NAME="pushpulse-emu-$i"
    if ! avdmanager list avd 2>/dev/null | grep -q "$AVD_NAME"; then
        echo "Creating AVD: $AVD_NAME"
        echo "no" | avdmanager create avd \
            -n "$AVD_NAME" \
            -k "system-images;android-33;google_apis;x86_64" \
            -d "pixel_6" \
            --force
    else
        echo "AVD $AVD_NAME already exists, skipping"
    fi
done

# Add to shell profile
if ! grep -q "ANDROID_HOME" "$HOME/.bashrc"; then
    cat >> "$HOME/.bashrc" << 'PROFILE'
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:/opt/gradle/gradle-8.4/bin:$PATH"
PROFILE
fi

# Clone/update the project repo
if [ ! -d "$HOME/news-ping" ]; then
    echo "Cloning repo..."
    git clone "$REPO_URL" "$HOME/news-ping"
else
    echo "Repo already present, pulling latest..."
    cd "$HOME/news-ping" && git pull
fi

echo "Android SDK and repo setup complete."
USERSCRIPT

# Install systemd units
cp "$(dirname "$0")/pushpulse-emu@.service" /etc/systemd/system/
sed -i "s/User=pushpulse/User=${INSTALL_USER}/" /etc/systemd/system/pushpulse-emu@.service
sed -i "s|/home/pushpulse|/home/${INSTALL_USER}|g" /etc/systemd/system/pushpulse-emu@.service
systemctl daemon-reload

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Build APK:       sudo -u $INSTALL_USER bash /home/$INSTALL_USER/news-ping/scripts/build-apk.sh"
echo "  2. Start emulators: systemctl enable --now 'pushpulse-emu@{1,2,3}'"
echo "  3. Wait ~90s for boot, then: sudo -u $INSTALL_USER bash /home/$INSTALL_USER/news-ping/scripts/install-news-apps.sh"
echo "  4. Install capture: sudo -u $INSTALL_USER bash /home/$INSTALL_USER/news-ping/scripts/install-capture.sh"
echo "  5. Grant access:    sudo -u $INSTALL_USER bash /home/$INSTALL_USER/news-ping/scripts/grant-notification-access.sh"
