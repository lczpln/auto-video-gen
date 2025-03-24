#!/bin/bash

# This script handles various video processing operations
# Created for auto-video-gen

set -e

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
FFMPEG_CMD=${FFMPEG_PATH:-ffmpeg}
FFPROBE_CMD=${FFPROBE_PATH:-ffprobe}

# Print usage information
function usage {
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  merge-audio-image    - Combine audio and image into video"
  echo "  add-subtitles        - Add subtitles to a video"
  echo "  get-audio-duration   - Get the duration of an audio file"
  echo ""
  echo "Use '$0 <command> --help' for more information on a specific command."
  exit 1
}

# Check if FFmpeg is installed
if ! command -v $FFMPEG_CMD &> /dev/null; then
  echo "Error: FFmpeg not found. Please install FFmpeg or set FFMPEG_PATH environment variable."
  exit 1
fi

# Check if FFprobe is installed
if ! command -v $FFPROBE_CMD &> /dev/null; then
  echo "Error: FFprobe not found. Please install FFprobe or set FFPROBE_PATH environment variable."
  exit 1
fi

# Function to merge audio and image into a video
function merge_audio_image {
  local audio=""
  local image=""
  local output=""
  local duration=""

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
      --audio)
        audio="$2"
        shift 2
        ;;
      --image)
        image="$2"
        shift 2
        ;;
      --output)
        output="$2"
        shift 2
        ;;
      --duration)
        duration="$2"
        shift 2
        ;;
      --help)
        echo "Usage: $0 merge-audio-image --audio=<audio_file> --image=<image_file> --output=<output_file> [--duration=<seconds>]"
        echo ""
        echo "Options:"
        echo "  --audio     Path to audio file"
        echo "  --image     Path to image file"
        echo "  --output    Path to output video file"
        echo "  --duration  Duration in seconds (optional, defaults to audio duration)"
        exit 0
        ;;
      *)
        echo "Unknown option: $1"
        exit 1
        ;;
    esac
  done

  # Validate required arguments
  if [[ -z "$audio" || -z "$image" || -z "$output" ]]; then
    echo "Error: Missing required arguments"
    echo "Usage: $0 merge-audio-image --audio=<audio_file> --image=<image_file> --output=<output_file> [--duration=<seconds>]"
    exit 1
  fi

  # Check if files exist
  if [[ ! -f "$audio" ]]; then
    echo "Error: Audio file not found: $audio"
    exit 1
  fi

  if [[ ! -f "$image" ]]; then
    echo "Error: Image file not found: $image"
    exit 1
  fi

  # Create output directory if it doesn't exist
  mkdir -p "$(dirname "$output")"

  # Get audio duration if not specified
  if [[ -z "$duration" ]]; then
    duration=$($FFPROBE_CMD -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$audio")
    echo "Audio duration: $duration seconds"
  fi

  # Create video from audio and image
  $FFMPEG_CMD -y -loop 1 -i "$image" -i "$audio" \
    -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
    -pix_fmt yuv420p -shortest -t "$duration" \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    "$output"

  echo "Video created successfully: $output"
}

# Function to add subtitles to a video
function add_subtitles {
  local video=""
  local subtitles=""
  local output=""

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
      --video)
        video="$2"
        shift 2
        ;;
      --subtitles)
        subtitles="$2"
        shift 2
        ;;
      --output)
        output="$2"
        shift 2
        ;;
      --help)
        echo "Usage: $0 add-subtitles --video=<video_file> --subtitles=<subtitle_file> --output=<output_file>"
        exit 0
        ;;
      *)
        echo "Unknown option: $1"
        exit 1
        ;;
    esac
  done

  # Validate required arguments
  if [[ -z "$video" || -z "$subtitles" || -z "$output" ]]; then
    echo "Error: Missing required arguments"
    echo "Usage: $0 add-subtitles --video=<video_file> --subtitles=<subtitle_file> --output=<output_file>"
    exit 1
  fi

  # Check if files exist
  if [[ ! -f "$video" ]]; then
    echo "Error: Video file not found: $video"
    exit 1
  fi

  if [[ ! -f "$subtitles" ]]; then
    echo "Error: Subtitle file not found: $subtitles"
    exit 1
  fi

  # Create output directory if it doesn't exist
  mkdir -p "$(dirname "$output")"

  # Add subtitles to video
  $FFMPEG_CMD -y -i "$video" -vf "subtitles=$subtitles:force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BackColour=&H80000000,BorderStyle=3,Outline=1,Shadow=1,MarginV=20'" \
    -c:v libx264 -c:a copy "$output"

  echo "Subtitles added successfully: $output"
}

# Function to get the duration of an audio file
function get_audio_duration {
  local audio=""

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
      --audio)
        audio="$2"
        shift 2
        ;;
      --help)
        echo "Usage: $0 get-audio-duration --audio=<audio_file>"
        exit 0
        ;;
      *)
        echo "Unknown option: $1"
        exit 1
        ;;
    esac
  done

  # Validate required arguments
  if [[ -z "$audio" ]]; then
    echo "Error: Missing required arguments"
    echo "Usage: $0 get-audio-duration --audio=<audio_file>"
    exit 1
  fi

  # Check if file exists
  if [[ ! -f "$audio" ]]; then
    echo "Error: Audio file not found: $audio"
    exit 1
  fi

  # Get audio duration
  $FFPROBE_CMD -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$audio"
}

# Main command handler
if [[ $# -lt 1 ]]; then
  usage
fi

command="$1"
shift

case $command in
  merge-audio-image)
    merge_audio_image "$@"
    ;;
  add-subtitles)
    add_subtitles "$@"
    ;;
  get-audio-duration)
    get_audio_duration "$@"
    ;;
  *)
    echo "Unknown command: $command"
    usage
    ;;
esac 