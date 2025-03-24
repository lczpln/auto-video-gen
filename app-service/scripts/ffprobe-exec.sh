#!/bin/bash

# Script wrapper para executar comandos FFprobe no contêiner dedicado
# Uso: ./ffprobe-exec.sh [comando ffprobe]
# Exemplo: ./ffprobe-exec.sh -v quiet -print_format json -show_format -show_streams input.mp4

# Obter o nome do contêiner da variável de ambiente ou utilizar o padrão
FFMPEG_CONTAINER=${FFMPEG_SERVICE_HOST:-ffmpeg-service}

# Verificar se o contêiner está em execução
if ! docker ps | grep -q $FFMPEG_CONTAINER; then
    echo "ERRO: O contêiner $FFMPEG_CONTAINER não está em execução"
    exit 1
fi

echo "Executando comando FFprobe no contêiner $FFMPEG_CONTAINER:"
echo "$ ffprobe $@"

# Executar o comando ffprobe no contêiner
docker exec $FFMPEG_CONTAINER ffprobe "$@"

exit $? 