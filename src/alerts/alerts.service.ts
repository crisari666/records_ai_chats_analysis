import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhatsAppAlert, WhatsAppAlertDocument } from 'src/conversations/schemas/whatsapp-alert.schema';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectModel(WhatsAppAlert.name)
    private readonly alertModel: Model<WhatsAppAlertDocument>,
  ) {}

  async createDisconnectedAlert(sessionObjectId: Types.ObjectId, sessionId: string, message?: string) {
    try {
      const alert = await this.alertModel.create({
        session: sessionObjectId,
        sessionId,
        type: 'disconnected',
        message: message ?? 'WhatsApp session disconnected',
        isRead: false,
      });
      return alert;
    } catch (error) {
      this.logger.error('Failed to create disconnected alert', error as Error);
      throw error;
    }
  }

  async createMessageDeletedAlert(
    sessionObjectId: Types.ObjectId,
    sessionId: string,
    messageId: string,
    chatId: string,
    timestamp: number,
    message?: string,
  ) {
    try {
      const alert = await this.alertModel.create({
        session: sessionObjectId,
        sessionId,
        type: 'message_deleted',
        messageId,
        chatId,
        timestamp,
        message: message ?? '--',
        isRead: false,
      });
      return alert;
    } catch (error) {
      this.logger.error('Failed to create message deleted alert', error as Error);
      throw error;
    }
  }

  async createMessageEditedAlert(
    sessionObjectId: Types.ObjectId,
    sessionId: string,
    messageId: string,
    chatId: string,
    timestamp: number,
    message?: string,
  ) {
    try {
      const alert = await this.alertModel.create({
        session: sessionObjectId,
        sessionId,
        type: 'message_edited',
        messageId,
        chatId,
        timestamp,
        message: message ?? `Message edited: ${messageId}`,
        isRead: false,
      });
      return alert;
    } catch (error) {
      this.logger.error('Failed to create message edited alert', error as Error);
      throw error;
    }
  }

  async createChatRemovedAlert(
    sessionObjectId: Types.ObjectId,
    sessionId: string,
    chatId: string,
    timestamp: number,
    message?: string,
  ) {
    try {
      const alert = await this.alertModel.create({
        session: sessionObjectId,
        sessionId,
        type: 'chat_removed',
        chatId,
        timestamp,
        message: message ?? `Chat removed: ${chatId}`,
        isRead: false,
      });
      return alert;
    } catch (error) {
      this.logger.error('Failed to create chat removed alert', error as Error);
      throw error;
    }
  }

  async markAsRead(alertId: string) {
    const _id = new Types.ObjectId(alertId);
    return this.alertModel.findByIdAndUpdate(
      _id,
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markMultipleAsRead(alertIds: string[]) {
    const objectIds = alertIds.map(id => new Types.ObjectId(id));
    const result = await this.alertModel.updateMany(
      { _id: { $in: objectIds } },
      { isRead: true, readAt: new Date() },
    );
    return result;
  }

  async markAllSessionAlertsAsRead(sessionId: string) {
    const result = await this.alertModel.updateMany(
      { sessionId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return result;
  }

  async markAllAsRead() {
    const result = await this.alertModel.updateMany(
      { isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return result;
  }

  async listSessionAlerts(sessionId: string, isRead?: boolean) {
    const query: any = { session: new Types.ObjectId(sessionId) };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    return this.alertModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getAllAlerts(isRead?: boolean, limit?: number, skip?: number) {
    const query: any = {};
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    const queryBuilder = this.alertModel.find(query).sort({ createdAt: -1 });
    if (skip) {
      queryBuilder.skip(skip);
    }
    if (limit) {
      queryBuilder.limit(limit);
    }
    return queryBuilder.exec();
  }

  async getAlertById(alertId: string) {
    const _id = new Types.ObjectId(alertId);
    return this.alertModel.findById(_id).exec();
  }

  async getUnreadCount(sessionId?: string) {
    const query: any = { isRead: false };
    if (sessionId) {
      query.sessionId = sessionId;
    }
    return this.alertModel.countDocuments(query).exec();
  }

  async getAlertsByChatAndSession(session: string, chatId: string, isRead?: boolean) {
    const query: any = { session: new Types.ObjectId(session), chatId };

    console.log({query});
    
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    return this.alertModel.find(query).sort({ createdAt: -1 }).exec();
  }
}

