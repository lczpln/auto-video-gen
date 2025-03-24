#!/bin/bash

# This script is a wrapper for ffprobe allowing it to be properly executed in headless environments
# It passes all arguments to ffprobe

# Use ffprobe from environment variable or default path
FFPROBE_CMD=${FFPROBE_PATH:-ffprobe}

# Execute ffprobe with all passed arguments
echo "Running: $FFPROBE_CMD $@"
$FFPROBE_CMD "$@"
EXIT_CODE=$?

# Return the exit code from ffprobe
exit $EXIT_CODE 