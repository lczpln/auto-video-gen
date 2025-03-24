# Auto Video Gen

## Overview

This service takes a prompt from the user and generates a complete video through a series of AI-powered workers:

1. **Content Generation**: Creates a script and scene descriptions based on the prompt
2. **Audio Generation**: Converts text to speech for each scene
3. **Image Generation**: Creates images for each scene based on descriptions
4. **Video Generation**: Combines audio and images into a complete video

## Features

- **AI Content Generation**: Uses Google's Gemini to create engaging video content
- **Asynchronous Processing**: Processes jobs in the background using Bull queues
- **Status Tracking**: Track the status of your video generation jobs
- **Image Regeneration**: Regenerate individual images or all images for a job
- **Scalable Architecture**: Built on NestJS with MongoDB and Redis

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables:

   ```
   # Required API Keys
   GEMINI_API_KEY=your_gemini_api_key

   # Feature Flags
   USE_AI_CONTENT=true
   USE_TTS=false
   USE_AI_IMAGES=false
   USE_FFMPEG=false
   ```

3. Start the services with Docker Compose:

   ```bash
   docker-compose up -d
   ```

4. The API will be available at `http://localhost:3000`

## API Usage

### Create a Video Job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain how neural networks work"}'
```

### Check Job Status

```bash
curl http://localhost:3000/api/jobs/{jobId}
```

### Approve Job for Video Generation

```bash
curl -X POST http://localhost:3000/api/jobs/{jobId}/approve
```

### Regenerate Images

```bash
curl -X POST http://localhost:3000/api/jobs/{jobId}/regenerate-image \
  -H "Content-Type: application/json" \
  -d '{"imageIndex": 2, "prompt": "Optional override prompt"}'
```

## Testing Without AI Services

The app includes mock implementations that work without external AI services. To use them, set the following environment variables:

```
USE_AI_CONTENT=false
USE_TTS=false
USE_AI_IMAGES=false
USE_FFMPEG=false
```

## License

MIT
