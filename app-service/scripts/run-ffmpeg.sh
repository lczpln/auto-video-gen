#!/bin/bash

# This script is a wrapper for ffmpeg allowing it to be properly executed in headless environments
# It sets up Xvfb if needed and passes all arguments to ffmpeg

# Check if DISPLAY variable is set
if [ -z "$DISPLAY" ]; then
    echo "DISPLAY not set, using default :99"
    export DISPLAY=:99
fi

# Check if Xvfb is running on the display
if ! ps aux | grep -v grep | grep -q "Xvfb $DISPLAY"; then
    echo "Starting Xvfb on $DISPLAY"
    Xvfb $DISPLAY -screen 0 1280x720x24 &
    XVFB_PID=$!
    # Give Xvfb time to start
    sleep 1
fi

# Use ffmpeg from environment variable or default path
FFMPEG_CMD=${FFMPEG_PATH:-ffmpeg}

# Execute ffmpeg with all passed arguments
echo "Running: $FFMPEG_CMD $@"
$FFMPEG_CMD "$@"
EXIT_CODE=$?

# Return the exit code from ffmpeg
exit $EXIT_CODE 