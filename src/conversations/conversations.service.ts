import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppSession, WhatsAppSessionDocument } from './schemas/whatsapp-session.schema';
import { WhatsAppChat, WhatsAppChatDocument } from './schemas/whatsapp-chat.schema';
import { HttpService } from './http.service';
import { ProjectResponse } from './interfaces/project-config.interface';
import { OllamaService } from './ollama.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectModel(WhatsAppSession.name) private whatsAppSessionModel: Model<WhatsAppSessionDocument>,
    @InjectModel(WhatsAppChat.name) private whatsAppChatModel: Model<WhatsAppChatDocument>,
    private httpService: HttpService,
    private ollamaService: OllamaService,
  ) { }

  /**
   * Get project configuration for LLM analysis
   * @param sessionId - The WhatsApp session ID
   * @returns Project configuration with LLM config
   */
  async getProjectConfig(sessionId: string): Promise<ProjectResponse | null> {
    try {
      // Get session from database
      const session = await this.whatsAppSessionModel.findOne({ sessionId }).exec();

      if (!session) {
        this.logger.warn(`Session not found: ${sessionId}`);
        return null;
      }

      if (!session.refId) {
        this.logger.warn(`Session ${sessionId} does not have a refId (project ID)`);
        return null;
      }

      // Get project configuration from API
      const projectId = session.refId.toString();
      const project = await this.httpService.getProjectByGroupId(projectId);

      this.logger.log(`Project config retrieved for session ${sessionId}, project: ${project.title}`);
      console.log('Project Response:', JSON.stringify(project, null, 2));

      return project;
    } catch (error) {
      this.logger.error(`Error getting project config for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Process message_create event and analyze conversation
   * @param data - The message data from the queue
   */
  async processMessageCreate(data: any): Promise<void> {
    try {
      this.logger.log(`Processing message_create event`);

      // Extract sessionId from the data structure
      const sessionId = data?.sessionId;

      if (!sessionId) {
        this.logger.warn('No sessionId found in message data');
        return;
      }

      // Extract chatId from the message data
      const chatId = data?.message?.chatId;

      if (!chatId) {
        this.logger.warn('No chatId found in message data');
        return;
      }

      // Get project configuration
      const projectConfig = await this.getProjectConfig(sessionId);

      if (!projectConfig) {
        this.logger.warn(`Could not retrieve project config for session ${sessionId}`);
        return;
      }

      this.logger.log(`Project config loaded for analysis. Config name: ${projectConfig.config.name}`);

      // Analyze conversation using Ollama service
      const analysisResponse = await this.ollamaService.analyzeConversation(
        projectConfig,
        chatId,
        sessionId,
      );

      this.logger.log(`Analysis completed for chat ${chatId}`);

      await this.whatsAppChatModel.updateOne(
        { chatId, sessionId },
        {
          $set: {
            analysis: analysisResponse,
            lastAnalysisTimestamp: Date.now()
          }
        }
      );


      console.log('Agent Analysis Response:', analysisResponse);

    } catch (error) {
      this.logger.error('Error processing message_create event:', error);
      throw error;
    }
  }
  /**
   * Analyze a specific conversation by ID
   * @param sessionId - The session ID
   * @param chatId - The chat ID
   */
  async analyzeConversation(sessionId: string, chatId: string): Promise<any> {
    try {
      this.logger.log(`Request to analyze conversation ${chatId} in session ${sessionId}`);

      // Get project configuration
      const projectConfig = await this.getProjectConfig(sessionId);

      if (!projectConfig) {
        throw new Error(`Could not retrieve project config for session ${sessionId}`);
      }

      this.logger.log(`Project config loaded for analysis. Config name: ${projectConfig.config.name}`);

      // Analyze conversation using Ollama service
      const analysisResponse = await this.ollamaService.analyzeConversation(
        projectConfig,
        chatId,
        sessionId,
      );

      this.logger.log(`Analysis completed for chat ${chatId}`);
      console.log({ analysisResponse });


      // Update chat with analysis result
      await this.whatsAppChatModel.updateOne(
        { chatId, sessionId },
        {
          $set: {
            analysis: analysisResponse,
            lastAnalysisTimestamp: Date.now(),
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        chatId,
        analysis: analysisResponse
      };

    } catch (error) {
      this.logger.error(`Error analyzing conversation ${chatId}:`, error);
      throw error;
    }
  }


  /**
   * Cron job to ensure analysis data is stored as objects
   * Runs every hour
   */
  /**
   * Cron job to analyze active conversations
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async analyseConvesation() {
    this.logger.log('Running cron job to analyze active conversations');

    try {
      // Find active conversations that need analysis
      // Criteria:
      // 1. lastMessage is defined (not null/empty)
      // 2. lastAnalysisTimestamp is null OR lastAnalysisTimestamp < lastMessageTimestamp
      const activeChats = await this.whatsAppChatModel.find({
        lastMessage: { $exists: true, $nin: [null, ''] },
        $or: [
          { lastAnalysisTimestamp: null },
          { $expr: { $lt: ['$lastAnalysisTimestamp', '$lastMessageTimestamp'] } }
        ]
      })
        .sort({ lastMessageTimestamp: -1 }) // Sort by most recent activity
        .limit(30)
        .exec();

      if (activeChats.length > 0) {
        this.logger.log(`Found ${activeChats.length} active chats needing analysis.`);

        for (const chat of activeChats) {
          try {
            this.logger.log(`Analyzing chat ${chat.chatId} (Session: ${chat.sessionId})`);

            // Analyze the conversation
            // We use analyzeConversation method which handles project config retrieval and Ollama call
            // It also updates the chat with the result
            await this.analyzeConversation(chat.sessionId, chat.chatId);

          } catch (e) {
            this.logger.error(`Failed to analyze chat ${chat.chatId}`, e);
          }
        }
      } else {
        this.logger.log('No active chats found needing analysis.');
      }
    } catch (error) {
      this.logger.error('Error in handleCron:', error);
    }
  }
}

