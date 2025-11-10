export interface ChatData {
  id: {
    _serialized: string;
  };
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
  archived: boolean;
  pinned: boolean;
  isReadOnly: boolean;
  isMuted: boolean;
  muteExpiration: number | null;
  lastMessage?: {
    type?: string;
    body?: string;
    timestamp?: number;
    fromMe?: boolean;
  } | null;
}

