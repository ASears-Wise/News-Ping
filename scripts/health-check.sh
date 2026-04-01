#!/usr/bin/env bash
# Health check script — run via cron every 5 minutes
# Checks emulators are running and capture service is active
set -euo pipefail

LOG="/var/log/pushpulse-health.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"
}

alert() {
    log "ALERT: $*"
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"🚨 PushPulse Health Alert: $*\"}" > /dev/null
    fi
}

EXPECTED_EMULATORS=3
ACTIVE=$(adb devices | grep -cE 'emulator-\d+\s+device' || true)

if [ "$ACTIVE" -lt "$EXPECTED_EMULATORS" ]; then
    alert "Only $ACTIVE/$EXPECTED_EMULATORS emulators are online"

    # Try to restart missing emulators
    for i in 1 2 3; do
        if ! systemctl is-active --quiet "pushpulse-emu@$i"; then
            log "Restarting pushpulse-emu@$i..."
            sudo systemctl restart "pushpulse-emu@$i"
        fi
    done
else
    log "All $EXPECTED_EMULATORS emulators healthy"
fi

# Check capture service is running on each emulator
for SERIAL in $(adb devices | grep -E 'emulator-\d+' | awk '{print $1}'); do
    SERVICE_RUNNING=$(adb -s "$SERIAL" shell dumpsys notification | grep -c "com.pushpulse.capture" || true)
    if [ "$SERVICE_RUNNING" -eq 0 ]; then
        alert "Capture service not running on $SERIAL"
    fi
done
