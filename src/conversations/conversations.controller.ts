import { Controller, Get, Post, Put, Param, Query, Body, ParseBoolPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { WhatsappStorageService } from './whatsapp-storage.service';
import { WhatsappAlertsService } from './whatsapp-alerts.service';
import { Types } from 'mongoose';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly storageService: WhatsappStorageService,
    private readonly alertsService: WhatsappAlertsService,
  ) {}

  @Get('sessions')
  async getSessions() {
    return this.storageService.getStoredSessions();
  }

  @Get('sessions/:sessionId/chats')
  async getChats(
    @Param('sessionId') sessionId: string,
    @Query('archived', new DefaultValuePipe(undefined), ParseBoolPipe) archived?: boolean,
    @Query('isGroup', new DefaultValuePipe(undefined), ParseBoolPipe) isGroup?: boolean,
    @Query('limit', new DefaultValuePipe(500), ParseIntPipe) limit?: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
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

  @Get('sessions/:sessionId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('chatId') chatId?: string,
    @Query('includeDeleted', new DefaultValuePipe(false), ParseBoolPipe) includeDeleted?: boolean,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('startTimestamp', new DefaultValuePipe(undefined), ParseIntPipe) startTimestamp?: number,
    @Query('endTimestamp', new DefaultValuePipe(undefined), ParseIntPipe) endTimestamp?: number,
  ) {
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
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
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
}

