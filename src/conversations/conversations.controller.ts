import { Controller, Get, Put, Post, Delete, Param, Query, ParseBoolPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { WhatsappStorageService } from './whatsapp-storage.service';
import { WhatsappAlertsService } from './whatsapp-alerts.service';
import { ConversationsService } from './conversations.service';
import { Types } from 'mongoose';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly storageService: WhatsappStorageService,
    private readonly alertsService: WhatsappAlertsService,
    private readonly conversationsService: ConversationsService,
  ) { }

  @Get('sessions')
  async getSessions() {
    return this.storageService.getStoredSessions();
  }

  @Get('sessions/:sessionId/chats')
  async getChats(
    @Param('sessionId') sessionId: string,
    @Query('archived') archived?: boolean,
    @Query('isGroup') isGroup?: boolean,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.storageService.getStoredChats(sessionId, {
      archived,
      isGroup,
      limit,
      skip,
    });
  }

  @Get('sessions/:sessionId/chats/:chatId')
  async getChat(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
  ) {
    return this.storageService.getStoredChat(sessionId, chatId);
  }

  @Put('sessions/:sessionId/chats/:chatId/delete')
  async deleteChat(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
  ) {
    await this.storageService.markChatAsDeleted(sessionId, chatId);
    return { message: 'Chat marked as deleted' };
  }

  @Post('sessions/:sessionId/chats/:chatId/analyze')
  async analyzeChat(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
  ) {
    return this.conversationsService.analyzeConversation(sessionId, chatId);
  }

  @Get('sessions/:sessionId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('chatId') chatId?: string,
    @Query('includeDeleted') includeDeleted?: boolean,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('startTimestamp') startTimestamp?: number,
    @Query('endTimestamp') endTimestamp?: number,
  ) {
    console.log({ chatId });

    return this.storageService.getStoredMessages(sessionId, chatId, {
      includeDeleted,
      limit,
      skip,
      startTimestamp,
      endTimestamp,
    });
  }

  @Get('sessions/:sessionId/messages/:messageId')
  async getMessage(
    @Param('sessionId') sessionId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.storageService.getStoredMessageById(sessionId, messageId);
  }

  @Get('sessions/:sessionId/messages/deleted')
  async getDeletedMessages(
    @Param('sessionId') sessionId: string,
    @Query('chatId') chatId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.storageService.getDeletedMessages(sessionId, chatId, limit);
  }

  @Get('sessions/:sessionId/alerts')
  async getAlerts(
    @Param('sessionId') sessionId: string,
  ) {
    const sessionObjectId = new Types.ObjectId(sessionId);
    return this.alertsService.listSessionAlerts(sessionObjectId);
  }

  @Put('alerts/:alertId/read')
  async markAlertAsRead(
    @Param('alertId') alertId: string,
  ) {
    return this.alertsService.markAsRead(alertId);
  }

  @Delete('sessions/:sessionId')
  async removeSessionData(
    @Param('sessionId') sessionId: string,
  ) {
    await this.conversationsService.removeSessionData(sessionId);
    return { message: 'Session data removed successfully' };
  }
}

