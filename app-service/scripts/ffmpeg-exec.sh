#!/bin/bash

# Script wrapper para executar comandos FFmpeg no contêiner dedicado
# Uso: ./ffmpeg-exec.sh [comando ffmpeg]
# Exemplo: ./ffmpeg-exec.sh -i input.mp4 -c:v libx264 output.mp4

# Obter o nome do contêiner da variável de ambiente ou utilizar o padrão
FFMPEG_CONTAINER=${FFMPEG_SERVICE_HOST:-ffmpeg-service}

# Verificar se o contêiner está em execução
if ! docker ps | grep -q $FFMPEG_CONTAINER; then
    echo "ERRO: O contêiner $FFMPEG_CONTAINER não está em execução"
    exit 1
fi

echo "Executando comando FFmpeg no contêiner $FFMPEG_CONTAINER:"
echo "$ ffmpeg $@"

# Executar o comando ffmpeg no contêiner
docker exec $FFMPEG_CONTAINER ffmpeg "$@"

exit $? 