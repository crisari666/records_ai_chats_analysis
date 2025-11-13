import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppMessage, WhatsAppMessageDocument } from './schemas/whatsapp-message.schema';
import { ProjectResponse } from './interfaces/project-config.interface';
import { Ollama } from 'ollama';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private ollama: Ollama;

  constructor(
    @InjectModel(WhatsAppMessage.name) private whatsAppMessageModel: Model<WhatsAppMessageDocument>,
  ) {
    // Initialize Ollama client (defaults to http://localhost:11434)
    this.ollama = new Ollama();
  }

  /**
   * Get conversation messages for a chat
   * @param chatId - The chat ID
   * @param sessionId - The session ID
   * @returns Array of messages sorted by timestamp
   */
  async getConversationMessages(chatId: string, sessionId: string): Promise<WhatsAppMessageDocument[]> {
    try {
      const messages = await this.whatsAppMessageModel
        .find({
          chatId,
          sessionId,
          isDeleted: false,
        })
        .sort({ timestamp: 1 }) // Sort by timestamp ascending (oldest first)
        .exec();

      this.logger.log(`Retrieved ${messages.length} messages for chat ${chatId}`);
      return messages;
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
        const sender = msg.fromMe ? 'User' : 'Contact';
        const timestamp = new Date(msg.timestamp * 1000).toISOString();
        const body = msg.body || '[Media or empty message]';
        return `[${timestamp}] ${sender}: ${body}`;
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
    
    prompt += `\n---\n\nConversation to analyze:\n\n${conversation}\n\n---\n\nPlease analyze this conversation according to the configuration above.`;
    
    return prompt;
  }

  /**
   * Analyze conversation using Ollama with deep-seek-llm model
   * @param projectConfig - Project configuration
   * @param chatId - The chat ID
   * @param sessionId - The session ID
   * @returns LLM response
   */
  async analyzeConversation(
    projectConfig: ProjectResponse,
    chatId: string,
    sessionId: string,
  ): Promise<string> {
    try {
      this.logger.log(`Starting conversation analysis for chat ${chatId} with model deep-seek-llm`);
      
      // Get conversation messages
      const messages = await this.getConversationMessages(chatId, sessionId);
      
      if (messages.length === 0) {
        this.logger.warn(`No messages found for chat ${chatId}`);
        return 'No messages found in this conversation.';
      }
      
      // Format messages for LLM
      const conversation = this.formatMessagesForLLM(messages);
      
      // Build prompt with config and conversation
      const prompt = this.buildPrompt(projectConfig, conversation);
      
      this.logger.log(`Sending request to Ollama with deep-seek-llm model`);
      
      
      // Call Ollama API using chat format
      const response = await this.ollama.chat({
        model: 'deepseek-llm',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
      });
      
      const analysisResult = response.message?.content || '';
      this.logger.log(`Received response from Ollama (${analysisResult.length} characters)`);
      console.log('Ollama Analysis Response:', analysisResult);
      
      return analysisResult;
    } catch (error) {
      this.logger.error(`Error analyzing conversation for chat ${chatId}:`, error);
      throw error;
    }
  }
}

