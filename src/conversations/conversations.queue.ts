import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RabbitService } from '../shared/rabbit.service';
import { ConversationsService } from './conversations.service';

@Controller()
export class ConversationsQueueController  {
  private readonly logger = new Logger(ConversationsQueueController.name);

  constructor(
    private rabbit: RabbitService,
    private conversationsService: ConversationsService,
  ) {}

  // Listen for messages from MS1

  @EventPattern('*')
  async handleSessionReady(@Payload() data: any) {
    this.logger.log(`🧠 Processing session ready`);
    this.logger.log({data});
  }

  @EventPattern('test_message')
  async handleIncoming(@Payload() data: any) {
    this.logger.log(`🧠 Processing message`);
    this.logger.log({data});
  }
  
  @EventPattern('chat_removed')
  async chatRemoved(@Payload() data: any) {
    this.logger.log(`🧠 Processing chat removed`);
    this.logger.log({data});
  }
  
  @EventPattern('message_create')
  async messageCreate(@Payload() data: any) {
    this.logger.log(`🧠 Processing message create`);
    this.logger.log({data});
    
    // Process the message and get project config for LLM analysis
    //await this.conversationsService.processMessageCreate(data);
  }
}