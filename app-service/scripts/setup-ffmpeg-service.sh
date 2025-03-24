#!/bin/bash

# Script para configurar o serviço FFmpeg
# Este script é executado no contêiner ffmpeg-service

echo "Configurando serviço FFmpeg..."

# Verificar a instalação do FFmpeg
if command -v ffmpeg >/dev/null 2>&1; then
    echo "FFmpeg está instalado."
    ffmpeg -version
else
    echo "FFmpeg não está instalado. Por favor, verifique a imagem Docker."
    exit 1
fi

# Verificar os codecs disponíveis
echo "Verificando suporte a codecs de áudio..."
ffmpeg -codecs | grep -E "libmp3|aac|opus|vorbis"

# Criar diretórios necessários para processamento de mídia
mkdir -p /storage/temp
mkdir -p /storage/processed

echo "Configuração do serviço FFmpeg concluída!"

# Manter o contêiner em execução
echo "O serviço FFmpeg está pronto e em execução." 