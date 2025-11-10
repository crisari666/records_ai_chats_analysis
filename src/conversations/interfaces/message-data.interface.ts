export interface MessageData {
  id: {
    _serialized: string;
    remote?: string;
  };
  body?: string;
  type: string;
  from: string;
  to: string;
  author?: string;
  fromMe: boolean;
  isForwarded?: boolean;
  forwardingScore?: number;
  isStatus?: boolean;
  hasMedia?: boolean;
  hasQuotedMsg?: boolean;
  isStarred?: boolean;
  isGif?: boolean;
  isEphemeral?: boolean;
  timestamp: number;
  ack?: number;
  deviceType?: string;
  broadcast?: boolean;
  mentionedIds?: string[];
  rawData?: any;
}