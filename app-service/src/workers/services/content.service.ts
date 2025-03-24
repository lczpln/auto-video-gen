import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "../../common/services/logger.service";
import * as path from "path";
import * as fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";

@Injectable()
export class ContentService {
  private readonly logger;
  private readonly storagePath: string;
  private readonly useAI: boolean;
  private readonly geminiApiKey: string;
  private genAI: any;

  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getLogger("content-service");
    this.storagePath = this.configService.get<string>(
      "STORAGE_PATH",
      "./storage"
    );

    // Configuration for AI integration
    this.useAI = this.configService.get<boolean>("USE_AI_CONTENT", true);
    this.geminiApiKey = this.configService.get<string>("GEMINI_API_KEY", "");

    // Initialize Gemini if API key is available
    if (this.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
    }
  }

  /**
   * Generate content based on prompt
   * This method can be called directly by the processor
   */
  async generateContent(prompt: string, options: any = {}): Promise<any> {
    this.logger.info(`Generating content for prompt: ${prompt}`);

    // First save the timestamp to use in filenames
    const timestamp = Date.now();

    // Ensure we have a valid configuration for content generation
    if (!this.useAI || !this.geminiApiKey) {
      this.logger.error("AI content generation is not properly configured");
      throw new Error(
        "AI content generation is not properly configured. Check your API keys and configuration."
      );
    }

    // Generate content using Gemini
    const content = await this.generateWithGemini(prompt, options);

    // Save the content to a file
    await this.saveContentToFile(content, timestamp);

    this.logger.info("Content generated successfully");
    return content;
  }

  /**
   * Generate content using Google's Gemini
   *
   * @param prompt - User prompt
   * @param options - Generation options
   */
  private async generateWithGemini(
    prompt: string,
    options: any = {}
  ): Promise<any> {
    this.logger.info(
      `Generating content with Gemini for: ${prompt.substring(0, 30)}...`
    );

    // Create the prompt for video content
    const contentPrompt = this.createVideoContentPrompt(prompt);

    const modelName = "gemini-2.0-flash";

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    });

    // Generate content
    const result = await model.generateContent(contentPrompt);
    const contentText = result.response.text();

    // Transform to expected format
    return this.transformContentFormat(contentText);
  }

  /**
   * Create a prompt for video content generation
   */
  private createVideoContentPrompt(prompt: string): string {
    return `
    Você é um especialista em criação de conteúdo para vídeos com foco em CONSISTÊNCIA VISUAL absoluta.
  
    Sua tarefa:
  
    1. NARRATIVA EM CENAS: Divida a explicação do tema em 10 cenas distintas, onde cada cena:
       - Apresenta uma parte lógica da narrativa ou um aspecto do tema
       - Se conecta com a cena anterior e a próxima para formar uma história coesa
       - Tem entre 1-2 frases (aproximadamente 15-30 palavras)
       - Usa linguagem envolvente, clara e contemporânea
  
    2. PERSONAGENS: Antes de criar as cenas, defina DETALHADAMENTE cada personagem que aparecerá na história:
       - Crie uma descrição física COMPLETA e DETALHADA de cada personagem (idade exata, cor e estilo de cabelo, cor dos olhos, tom de pele, altura, estrutura corporal, roupas específicas, acessórios, etc.)
       - Defina características faciais distintivas (formato do rosto, nariz, olhos, sobrancelhas, etc.)
       - Especifique exatamente as mesmas roupas e acessórios que o personagem usará em todas as cenas
       - Atribua um nome a cada personagem para facilitar a referência
  
    3. IMAGENS: Para cada cena, crie um prompt detalhado de imagem que:
       - COMECE SEMPRE com "Fotografia realista de alta qualidade, não ilustração, não desenho, não cartoon, estilo fotográfico hiper-realista,"
       - COPIE E COLE a descrição EXATA e COMPLETA de cada personagem que aparece na cena, sem alterar NENHUM detalhe
       - Inclua detalhes sobre cenário, iluminação e atmosfera
       - Especifique a mesma paleta de cores e estilo visual em todas as cenas
       - Mantenha ABSOLUTA CONSISTÊNCIA entre os prompts de imagem, especialmente para:
          * Características físicas dos personagens, como: cor da pele, cabelo, olhos, acessórios, roupas, itens que eles estão segurando, etc... (EXATAMENTE as mesmas em todas as cenas)
          * Objetos e elementos que aparecem em múltiplas cenas (mesmas cores, tamanhos e formas)
          * Ambientes e localizações que se repetem (mesma arquitetura, decoração, etc.)
          * Tempo cronológico da narrativa (mesma hora do dia, condições climáticas, etc.)
  
    Tema a desenvolver: ${prompt}
  
    Formato de saída (IMPORTANTE: Retorne APENAS o JSON válido sem nenhum texto adicional):
    {
        "title": "Título envolvente e inspirador para o vídeo (máximo 10 palavras)",
        "scenes": [
            {
                "text": "Texto da cena 1 (15-30 palavras)",
                "image": "High quality realistic photography, not illustration, not drawing, not cartoon, hyper-realistic photographic style, [COMPLETE DESCRIPTION OF PRESENT CHARACTERS], [SCENE DESCRIPTION]. Maintain absolute visual consistency with other scenes. Same realistic photographic style."
            },
            {
                "text": "Texto da cena 2 (15-30 palavras)",
                "image": "High quality realistic photography, not illustration, not drawing, not cartoon, hyper-realistic photographic style, [COMPLETE DESCRIPTION OF PRESENT CHARACTERS], [SCENE DESCRIPTION]. Maintain absolute visual consistency with other scenes. Same realistic photographic style."
            }
        ],
        "tags": ["#tag1", "#tag2", "#tag3", "#tag4", ...]
    }
  
    INSTRUÇÕES CRÍTICAS:
    1. Sua resposta deve ser APENAS o JSON válido, sem texto introdutório ou explicativo.
    2. Mantenha RIGOROSA CONSISTÊNCIA nas características dos personagens - COPIE E COLE as mesmas descrições em cada prompt de imagem.
    3. Todos os prompts de imagem DEVEM gerar imagens fotorrealistas, NUNCA desenhos ou ilustrações.
    4. NUNCA altere a aparência, idade, roupas ou características de um personagem entre cenas.
    5. Cada prompt de imagem deve ser AUTOSSUFICIENTE e conter TODAS as informações necessárias para gerar uma imagem consistente com as demais (imagens) cenas.
    `;
  }

  /**
   * Transform content from AI response format to expected format
   */
  private transformContentFormat(contentJson: string | any): any {
    try {
      // Try to parse as JSON
      contentJson =
        typeof contentJson === "string"
          ? contentJson
              .replace(/```json\s*/g, "")
              .replace(/```\s*/g, "")
              .replace(/\*/g, "")
          : contentJson;

      contentJson =
        typeof contentJson === "string" ? JSON.parse(contentJson) : contentJson;

      // Validate required content structure
      if (
        !contentJson.title ||
        !contentJson.scenes ||
        !Array.isArray(contentJson.scenes) ||
        contentJson.scenes.length === 0
      ) {
        this.logger.error("Generated content is missing required structure");
        throw new Error(
          "Generated content is missing required structure (title and scenes)"
        );
      }

      let fullText = "";

      // Combine all scene texts for the full script
      for (const scene of contentJson.scenes || []) {
        if (!scene.text || !scene.image) {
          this.logger.error(
            "One or more scenes are missing text or image prompts"
          );
          throw new Error(
            "One or more scenes are missing text or image prompts"
          );
        }
        fullText += " " + (scene.text || "");
      }

      // Return in expected format
      return {
        title: contentJson.title,
        description: fullText.trim(),
        scenes: contentJson.scenes.map((scene: any) => ({
          title: `Scene ${contentJson.scenes.indexOf(scene) + 1}`,
          text: scene.text,
          image: scene.image,
        })),
        tags: contentJson.tags || [],
      };
    } catch (error) {
      this.logger.error(`Error transforming content format: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save content to a file for later reference
   */
  private async saveContentToFile(
    content: any,
    timestamp: number
  ): Promise<string> {
    try {
      const contentDir = path.join(this.storagePath, "content");
      await fs.mkdir(contentDir, { recursive: true });

      const filename = `content-${timestamp}.json`;
      const filePath = path.join(contentDir, filename);

      await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");

      this.logger.info(`Content saved to file: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`Error saving content file: ${error.message}`);
      // This non-critical error shouldn't block the overall process
      return null;
    }
  }
}
