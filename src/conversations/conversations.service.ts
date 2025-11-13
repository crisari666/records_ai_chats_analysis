import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppSession, WhatsAppSessionDocument } from './schemas/whatsapp-session.schema';
import { HttpService } from './http.service';
import { ProjectResponse } from './interfaces/project-config.interface';
import { OllamaService } from './ollama.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectModel(WhatsAppSession.name) private whatsAppSessionModel: Model<WhatsAppSessionDocument>,
    private httpService: HttpService,
    private ollamaService: OllamaService,
  ) {}

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
      console.log('Agent Analysis Response:', analysisResponse);
      
    } catch (error) {
      this.logger.error('Error processing message_create event:', error);
      throw error;
    }
  }
}

