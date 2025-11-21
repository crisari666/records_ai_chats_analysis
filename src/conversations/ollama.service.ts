import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppMessage, WhatsAppMessageDocument } from './schemas/whatsapp-message.schema';
import { ProjectResponse } from './interfaces/project-config.interface';
import { Ollama } from 'ollama';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private ollama: Ollama;
  private readonly ollamaTimeout: number;
  private readonly maxMessagesForAnalysis: number;
  private readonly ollamaHost: string;

  constructor(
    @InjectModel(WhatsAppMessage.name) private whatsAppMessageModel: Model<WhatsAppMessageDocument>,
    private configService: ConfigService,
  ) {
    // Get configuration from environment variables with defaults
    this.ollamaHost = this.configService.get<string>('OLLAMA_HOST', 'http://localhost:11434');
    this.ollamaTimeout = this.configService.get<number>('OLLAMA_TIMEOUT', 60000); // 60 seconds default
    this.maxMessagesForAnalysis = this.configService.get<number>('MAX_MESSAGES_FOR_ANALYSIS', 50); // Limit messages to reduce prompt size

    // Initialize Ollama client with custom host
    this.ollama = new Ollama({ host: this.ollamaHost });

    this.logger.log(`Ollama service initialized with host: ${this.ollamaHost}, timeout: ${this.ollamaTimeout}ms, max messages: ${this.maxMessagesForAnalysis}`);
  }

  /**
   * Get conversation messages for a chat
   * Limits the number of messages to improve performance
   * @param chatId - The chat ID
   * @param sessionId - The session ID
   * @returns Array of messages sorted by timestamp (limited to most recent)
   */
  async getConversationMessages(chatId: string, sessionId: string): Promise<WhatsAppMessageDocument[]> {
    try {
      const messages = await this.whatsAppMessageModel
        .find({
          chatId,
          sessionId,
          isDeleted: false,
        })
        .sort({ timestamp: -1 }) // Sort descending to get most recent first
        .limit(this.maxMessagesForAnalysis) // Limit number of messages
        .exec();

      // Reverse to get chronological order (oldest to newest)
      const chronologicalMessages = messages.reverse();

      this.logger.log(`Retrieved ${chronologicalMessages.length} messages for chat ${chatId} (limited to ${this.maxMessagesForAnalysis})`);
      return chronologicalMessages;
    } catch (error) {
      this.logger.error(`Error retrieving messages for chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Format messages for LLM input
   * @param messages - Array of WhatsApp messages
   * @returns Formatted conversation string
   */
  private formatMessagesForLLM(messages: WhatsAppMessageDocument[]): string {
    return messages
      .map((msg) => {
        const sender = msg.fromMe ? 'Agent' : 'Customer';
        const timestamp = new Date(msg.timestamp * 1000).toISOString();
        const body = msg.body || '[Media or empty message]';
        return `[${sender}: ${body}]`;
      })
      .join('\n');
  }

  /**
   * Build the prompt with project configuration and conversation
   * @param projectConfig - Project configuration
   * @param conversation - Formatted conversation messages
   * @returns Complete prompt string
   */
  private buildPrompt(projectConfig: ProjectResponse, conversation: string): string {
    const config = projectConfig.config;

    let prompt = `You are an AI agent configured for: ${config.name}\n\n`;

    if (config.description) {
      prompt += `Description: ${config.description}\n\n`;
    }

    if (config.domain) {
      prompt += `Domain: ${config.domain}\n\n`;
    }

    if (config.instructions && config.instructions.length > 0) {
      prompt += `Instructions:\n${config.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n')}\n\n`;
    }

    if (config.fields && Object.keys(config.fields).length > 0) {
      prompt += `Fields to analyze:\n${Object.entries(config.fields).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\n`;
    }

    if (config.output_format) {
      prompt += `Output Format: ${JSON.stringify(config.output_format, null, 2)}\n\n`;
    }

    if (config.example_analysis && config.example_analysis.length > 0) {
      prompt += `Example Analysis:\n${JSON.stringify(config.example_analysis, null, 2)}\n\n`;
    }

    prompt += `\n---\n\nConversation to analyze:\n\n${conversation}\n\n---\n\nPlease analyze this conversation according to the configuration above. IMPORTANT: Return ONLY a valid JSON object matching the Output Format. Do not include any markdown formatting or explanation.`;

    return prompt;
  }

  /**
   * Analyze conversation using Ollama with deep-seek-llm model
   * @param projectConfig - Project configuration
   * @param chatId - The chat ID
   * @param sessionId - The session ID
   * @returns LLM response as an object
   */
  async analyzeConversation(
    projectConfig: ProjectResponse,
    chatId: string,
    sessionId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Starting conversation analysis for chat ${chatId} with model deep-seek-llm`);

      // Get conversation messages
      const messages = await this.getConversationMessages(chatId, sessionId);

      if (messages.length === 0) {
        this.logger.warn(`No messages found for chat ${chatId}`);
        return { error: 'No messages found in this conversation.' };
      }

      // Format messages for LLM
      const conversation = this.formatMessagesForLLM(messages);

      console.log({ conversation });

      // Build prompt with config and conversation
      const prompt = this.buildPrompt(projectConfig, conversation);

      this.logger.log(`Sending request to Ollama with deepseek-llm model (timeout: ${this.ollamaTimeout}ms)`);
      const startTime = Date.now();

      // Call Ollama API using chat format with timeout and optimized parameters
      const response = await Promise.race([
        this.ollama.chat({
          model: 'deepseek-llm',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          format: 'json',
          stream: false,
          options: {
            // Optimize for faster inference on limited hardware
            num_ctx: 4096, // Reduced context window (default is often 8192+)
            num_predict: 1024, // Limit max tokens to generate
            temperature: 0.7, // Slightly lower for more focused responses
            top_p: 0.9,
            top_k: 40,
            num_thread: 4, // Adjust based on your VPS CPU cores
          },
        }),
      ]) as any;

      const elapsedTime = Date.now() - startTime;
      this.logger.log(`Ollama request completed in ${elapsedTime}ms`);

      const analysisResult = response.message?.content || '{}';
      this.logger.log(`Received response from Ollama (${analysisResult.length} characters)`);

      try {
        const parsedResult = JSON.parse(analysisResult);
        console.log('Ollama Analysis Response (Parsed):', parsedResult);
        return parsedResult;
      } catch (e) {
        this.logger.error('Failed to parse Ollama response as JSON', e);
        console.log('Raw Ollama Response:', analysisResult);
        // Attempt to clean up the response if it contains markdown code blocks
        const cleanResult = analysisResult.replace(/```json\n|\n```/g, '').trim();
        try {
          const parsedCleanResult = JSON.parse(cleanResult);
          return parsedCleanResult;
        } catch (e2) {
          return { raw: analysisResult, error: 'Failed to parse JSON' };
        }
      }

    } catch (error) {
      this.logger.error(`Error analyzing conversation for chat ${chatId}:`, error);
      throw error;
    }
  }
}

