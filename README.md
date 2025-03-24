# Auto Video Gen

Serviço para geração automática de vídeos utilizando NestJS.

## Funcionalidades

- Criação de jobs para geração de vídeos
- Geração de conteúdo de texto com IA
- Geração de áudio a partir de texto
- Geração de imagens para ilustrar o conteúdo
- Geração de vídeo a partir de áudio e imagens com legendas

## Serviços

### Geração de Vídeo

O serviço de geração de vídeo (`VideoService`) utiliza FFmpeg e FFCreator para produzir vídeos a partir de arquivos de áudio e imagens. O serviço cria uma sequência de cenas, cada uma com um arquivo de áudio e uma imagem, e adiciona legendas ao vídeo final.

Principais componentes:

- `VideoService`: Serviço principal que coordena a geração de vídeo
- `VideoCreatorClass`: Classe interna que lida com a criação de vídeos utilizando FFCreator
- Processamento de legendas com suporte para alinhamento de texto com áudio
- Fallback para métodos mais simples em caso de falha

#### Configuração

As seguintes opções podem ser configuradas através de variáveis de ambiente:

- `STORAGE_PATH`: Caminho de armazenamento dos arquivos
- `USE_FFMPEG`: Se deve usar FFmpeg para geração de vídeo
- `FFMPEG_PATH`: Caminho para o binário do FFmpeg
- `FFPROBE_PATH`: Caminho para o binário do FFprobe
- `VIDEO_WIDTH`: Largura do vídeo em pixels
- `VIDEO_HEIGHT`: Altura do vídeo em pixels
- `USE_XVFB`: Se deve usar Xvfb para renderização em ambientes headless
- `XVFB_DISPLAY`: Display do Xvfb
- `VIDEO_OUTPUT_DIR`: Diretório para saída de vídeos

## Instalação

```bash
npm install
```

## Execução

### Desenvolvimento

```bash
npm run start:dev
```

### Produção

```bash
npm run build
npm run start:prod
```

### Ambiente Local

```bash
npm run start:local
```

## Dependências Externas

O serviço depende das seguintes ferramentas externas:

- FFmpeg: Manipulação de vídeo e áudio
- Xvfb: Framebuffer virtual para ambientes headless

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

- Node.js (v16+)
- Docker and Docker Compose
- MongoDB
- Redis

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

### Development Setup

For local development:

1. Install dependencies:

   ```bash
   cd app-service
   npm install
   ```

2. Start the development server:
   ```bash
   npm run start:dev
   ```

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
