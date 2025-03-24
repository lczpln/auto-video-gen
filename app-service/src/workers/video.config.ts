import { registerAs } from "@nestjs/config";

export default registerAs("video", () => ({
  storagePath: process.env.STORAGE_PATH || "./storage",
  useFFmpeg: process.env.USE_FFMPEG !== "false",
  ffmpegPath: process.env.FFMPEG_PATH || "/usr/bin/ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "/usr/bin/ffprobe",
  videoWidth: parseInt(process.env.VIDEO_WIDTH, 10) || 1080,
  videoHeight: parseInt(process.env.VIDEO_HEIGHT, 10) || 1920,
  useXvfb: process.env.USE_XVFB !== "false",
  xvfbDisplay: process.env.XVFB_DISPLAY || ":99",
  videoOutputDir: process.env.VIDEO_OUTPUT_DIR || "videos",
}));
