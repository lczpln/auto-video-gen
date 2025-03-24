/**
 * Script para testar o FFCreator
 *
 * Para executar:
 * ./run-ffcreator.sh node /app/scripts/test-ffcreator.js
 */

const {
  FFCreator,
  FFScene,
  FFText,
  FFImage,
  FFVideo,
  FFAudio,
} = require("ffcreator");
const path = require("path");
const fs = require("fs");

// Configurações
const outputDir = "/storage/videos";
const cacheDir = "/storage/temp";
const width = process.env.VIDEO_WIDTH
  ? parseInt(process.env.VIDEO_WIDTH)
  : 1280;
const height = process.env.VIDEO_HEIGHT
  ? parseInt(process.env.VIDEO_HEIGHT)
  : 720;

console.log(`Configurações do vídeo: ${width}x${height}`);
console.log(`Diretório de saída: ${outputDir}`);
console.log(`Diretório de cache: ${cacheDir}`);

// Verificar se os diretórios existem
if (!fs.existsSync(outputDir)) {
  console.log(`Criando diretório de saída: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(cacheDir)) {
  console.log(`Criando diretório de cache: ${cacheDir}`);
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Criar o criador de vídeo
const creator = new FFCreator({
  cacheDir,
  outputDir,
  width,
  height,
  fps: 30,
  pixelFormat: "yuv420p",
});

// Criar uma cena
const scene = new FFScene();
scene.setBgColor("#000000");
scene.setDuration(5);

// Adicionar texto animado
const text = new FFText({
  text: "Teste FFCreator",
  x: width / 2,
  y: height / 2,
});
text.setColor("#ffffff");
text.setStyle({
  fontSize: 60,
  fontFamily: "Arial",
  align: "center",
  padding: 10,
});
text.setBackgroundColor("#00000000");
text.addEffect("fadeIn", 0, 1);
text.addEffect("fadeOut", 4, 5);
scene.addChild(text);

// Adicionar a cena ao criador
creator.addChild(scene);

// Definir o nome do arquivo de saída
const timestamp = Date.now();
creator.output(`test-ffcreator-${timestamp}.mp4`);

// Eventos
creator.on("start", () => {
  console.log("Iniciando renderização...");
});

creator.on("progress", (progress) => {
  console.log(`Progresso: ${(progress * 100).toFixed(2)}%`);
});

creator.on("complete", () => {
  console.log("Renderização concluída com sucesso!");
  process.exit(0);
});

creator.on("error", (e) => {
  console.error("Erro durante a renderização:", e);
  process.exit(1);
});

// Iniciar a criação
console.log("Iniciando criação do vídeo de teste...");
creator.start();
