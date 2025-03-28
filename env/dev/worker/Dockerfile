FROM jrottenberg/ffmpeg:6-ubuntu-edge


ENV NODE_VERSION=20.17.0
ENV NVM_DIR /usr/local/nvm
RUN mkdir -p $NVM_DIR

# Install Node.js 20
RUN apt-get -y update && apt-get install -y curl && \
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash - && \
  . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}

RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV NODE_PATH $NVM_DIR/versions/node/v${NODE_VERSION}/bin
ENV PATH $NODE_PATH:$PATH
RUN echo "NODE_PATH: $NODE_PATH"
RUN node --version
RUN npm --version


# Verify installations
RUN ffmpeg -version && node --version && npm --version

# Set working directory
WORKDIR /app

# Dependencies currently being installed outside the docker
# # Copy package files
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# Copy source code
COPY ./app-service .


# Command to run on container start
ENTRYPOINT [ "npm", "run", "dev" ]
