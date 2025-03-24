/**
 * Script para testar a configuração do FFmpeg
 * Execute com: node scripts/test-ffmpeg.js
 */

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Definir caminhos do FFmpeg e FFprobe a partir das variáveis de ambiente ou usar padrões
const ffmpegPath = process.env.FFMPEG_PATH || "/usr/local/bin/ffmpeg";
const ffprobePath = process.env.FFPROBE_PATH || "/usr/local/bin/ffprobe";

console.log("====== Iniciando teste de FFmpeg ======");
console.log(`FFmpeg: ${ffmpegPath}`);
console.log(`FFprobe: ${ffprobePath}`);

// Criar pasta temporária para testes se não existir
const tempDir = path.join(__dirname, "..", "storage", "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`Diretório temporário criado: ${tempDir}`);
}

// Verificar versão do FFmpeg
console.log("\n1. Verificando versão do FFmpeg:");
exec(`${ffmpegPath} -version`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao verificar versão: ${error.message}`);
    return;
  }
  console.log(stdout.split("\n")[0]);

  // Verificar codecs suportados
  console.log("\n2. Verificando codecs de áudio suportados:");
  exec(
    `${ffmpegPath} -codecs | grep -E 'aac|mp3|opus|vorbis'`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao verificar codecs: ${error.message}`);
        return;
      }
      console.log(stdout);

      // Criar um arquivo de teste de áudio
      console.log("\n3. Criando um arquivo de teste de áudio:");
      const testAudioFile = path.join(tempDir, "test_audio.mp3");

      // Gerar um tom de teste usando FFmpeg
      exec(
        `${ffmpegPath} -f lavfi -i "sine=frequency=1000:duration=5" -c:a libmp3lame ${testAudioFile}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(
              `Erro ao criar arquivo de áudio de teste: ${error.message}`
            );
            return;
          }

          console.log(`Arquivo de áudio de teste gerado: ${testAudioFile}`);

          // Verificar informações do arquivo de áudio gerado
          console.log("\n4. Verificando informações do arquivo de áudio:");
          exec(
            `${ffprobePath} -v quiet -print_format json -show_format -show_streams ${testAudioFile}`,
            (error, stdout, stderr) => {
              if (error) {
                console.error(
                  `Erro ao verificar informações do arquivo: ${error.message}`
                );
                return;
              }

              try {
                const info = JSON.parse(stdout);
                console.log("Formato:", info.format.format_name);
                console.log("Duração:", info.format.duration, "segundos");
                console.log(
                  "Bitrate:",
                  Math.round(info.format.bit_rate / 1000),
                  "kbps"
                );

                if (info.streams && info.streams.length > 0) {
                  console.log("Codec de áudio:", info.streams[0].codec_name);
                }

                console.log(
                  "\n====== Teste de FFmpeg completo com sucesso! ======"
                );
              } catch (e) {
                console.error("Erro ao analisar informações do arquivo:", e);
              }
            }
          );
        }
      );
    }
  );
});
