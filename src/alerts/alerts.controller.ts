import { Controller, Get, Put, Param, Query, Body, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { AlertsService } from './alerts.service';
import { Types } from 'mongoose';

interface WhatsAppAlertPayload {
  eventType: string;
  alert: {
    _id: string;
    session: string;
    sessionId: string;
    type: 'disconnected' | 'message_deleted' | 'message_edited' | 'chat_removed';
    message?: string;
    isRead: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    messageId?: string;
    chatId?: string;
    timestamp?: number;
  };
}

@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly alertsService: AlertsService) {}

  // HTTP Endpoints for Web Client

  @Get()
  async getAllAlerts(
    @Query('isRead') isReadStr?: string,
    @Query('limit') limitStr?: string,
    @Query('skip') skipStr?: string,
  ) {
    const isRead = isReadStr !== undefined ? isReadStr === 'true' : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const skip = skipStr ? parseInt(skipStr, 10) : undefined;
    return this.alertsService.getAllAlerts(isRead, limit, skip);
  }

  @Get('unread/count')
  async getUnreadCount(@Query('sessionId') sessionId?: string) {
    const count = await this.alertsService.getUnreadCount(sessionId);
    return { count };
  }

  @Get('sessions/:sessionId')
  async getSessionAlerts(
    @Param('sessionId') sessionId: string,
    @Query('isRead') isReadStr?: string,
  ) {
    const isRead = isReadStr !== undefined ? isReadStr === 'true' : undefined;
    return this.alertsService.listSessionAlerts(sessionId, isRead);
  }

  @Get('sessions/:sessionId/chats/:chatId')
  async getChatAlerts(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Query('isRead') isReadStr?: string,
  ) {
    const isRead = isReadStr !== undefined ? isReadStr === 'true' : undefined;
    return this.alertsService.getAlertsByChatAndSession(sessionId, chatId, isRead);
  }

  @Get(':alertId')
  async getAlertById(@Param('alertId') alertId: string) {
    return this.alertsService.getAlertById(alertId);
  }

  @Put(':alertId/read')
  async markAlertAsRead(@Param('alertId') alertId: string) {
    return this.alertsService.markAsRead(alertId);
  }

  @Put('read/bulk')
  async markMultipleAlertsAsRead(@Body() body: { alertIds: string[] }) {
    const result = await this.alertsService.markMultipleAsRead(body.alertIds);
    return {
      message: `Marked ${result.modifiedCount} alerts as read`,
      modifiedCount: result.modifiedCount,
    };
  }

  @Put('sessions/:sessionId/read')
  async markSessionAlertsAsRead(@Param('sessionId') sessionId: string) {
    const result = await this.alertsService.markAllSessionAlertsAsRead(sessionId);
    return {
      message: `Marked ${result.modifiedCount} alerts as read for session ${sessionId}`,
      modifiedCount: result.modifiedCount,
    };
  }

  @Put('read/all')
  async markAllAlertsAsRead() {
    const result = await this.alertsService.markAllAsRead();
    return {
      message: `Marked ${result.modifiedCount} alerts as read`,
      modifiedCount: result.modifiedCount,
    };
  }

  // RabbitMQ Event Listeners

  @EventPattern('whatsapp.alert.disconnected')
  async handleDisconnectedAlert(
    @Payload() data: WhatsAppAlertPayload,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received disconnected alert: ${JSON.stringify(data)}`);
    
    try {
      const sessionObjectId = new Types.ObjectId(data.alert.session);
      await this.alertsService.createDisconnectedAlert(
        sessionObjectId,
        data.alert.sessionId,
        data.alert.message,
      );
      
      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error('Error processing disconnected alert', error);
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.nack(originalMsg, false, true); // requeue on error
    }
  }

  @EventPattern('whatsapp.alert.message_deleted')
  async handleMessageDeletedAlert(
    @Payload() data: WhatsAppAlertPayload,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received message deleted alert: ${JSON.stringify(data)}`);
    
    try {
      if (!data.alert.messageId || !data.alert.chatId || !data.alert.timestamp) {
        this.logger.warn('Missing required fields for message_deleted alert', data);
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg); // Acknowledge to avoid requeue loop
        return;
      }

      const sessionObjectId = new Types.ObjectId(data.alert.session);
      await this.alertsService.createMessageDeletedAlert(
        sessionObjectId,
        data.alert.sessionId,
        data.alert.messageId,
        data.alert.chatId,
        data.alert.timestamp,
        data.alert.message,
      );
      
      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error('Error processing message deleted alert', error);
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.nack(originalMsg, false, true); // requeue on error
    }
  }

  @EventPattern('whatsapp.alert.message_edited')
  async handleMessageEditedAlert(
    @Payload() data: WhatsAppAlertPayload,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received message edited alert: ${JSON.stringify(data)}`);
    
    try {
      if (!data.alert.messageId || !data.alert.chatId || !data.alert.timestamp) {
        this.logger.warn('Missing required fields for message_edited alert', data);
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg); // Acknowledge to avoid requeue loop
        return;
      }

      const sessionObjectId = new Types.ObjectId(data.alert.session);
      await this.alertsService.createMessageEditedAlert(
        sessionObjectId,
        data.alert.sessionId,
        data.alert.messageId,
        data.alert.chatId,
        data.alert.timestamp,
        data.alert.message,
      );
      
      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error('Error processing message edited alert', error);
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.nack(originalMsg, false, true); // requeue on error
    }
  }

  @EventPattern('whatsapp.alert.chat_removed')
  async handleChatRemovedAlert(
    @Payload() data: WhatsAppAlertPayload,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received chat removed alert: ${JSON.stringify(data)}`);
    
    try {
      if (!data.alert.chatId || !data.alert.timestamp) {
        this.logger.warn('Missing required fields for chat_removed alert', data);
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg); // Acknowledge to avoid requeue loop
        return;
      }

      const sessionObjectId = new Types.ObjectId(data.alert.session);
      await this.alertsService.createChatRemovedAlert(
        sessionObjectId,
        data.alert.sessionId,
        data.alert.chatId,
        data.alert.timestamp,
        data.alert.message,
      );
      
      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error('Error processing chat removed alert', error);
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.nack(originalMsg, false, true); // requeue on error
    }
  }
}

