FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python-is-python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    ffmpeg \
    xvfb \
    libxi-dev \
    libglu1-mesa-dev \
    libglew-dev \
    libxrender-dev \
    libxext-dev \
    libxinerama-dev \
    libx11-dev \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    mesa-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for headless environment
ENV DISPLAY=:99
ENV VIDEO_WIDTH=1280
ENV VIDEO_HEIGHT=720
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:/usr/lib

# Setup FFCreator without GL
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package.json files
COPY ./app-service/package*.json ./

# Install base dependencies
RUN npm install --no-package-lock --omit=optional

# Add script to create videos with FFmpeg directly
COPY ./app-service/scripts /app/scripts
RUN chmod +x /app/scripts/*.sh

# Copy app source code
COPY ./app-service .

# Create entrypoint script for Xvfb setup
RUN echo '#!/bin/bash\n\
echo "Starting Xvfb..."\n\
Xvfb :99 -ac -screen 0 1280x1024x24 &\n\
XVFB_PID=$!\n\
echo "Xvfb started with PID: $XVFB_PID"\n\
\n\
echo "Checking FFmpeg..."\n\
ffmpeg -version\n\
\n\
echo "Checking OpenGL..."\n\
glxinfo | grep "OpenGL version"\n\
\n\
echo "Executing command: $@"\n\
exec "$@"' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# Expose port
EXPOSE 3000

# Start app with Xvfb
CMD ["npm", "run", "start:dev"] 