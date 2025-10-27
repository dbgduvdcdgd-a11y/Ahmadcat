export interface MessageFile {
    name: string;
    type: 'image' | 'video' | 'audio';
    url: string; // Base64 data URL
}

export interface Message {
  id: string;
  sender: string;
  text?: string; // Optional text content or caption
  file?: MessageFile;
  sticker?: string; // URL to a sticker image
  replyTo?: string; // ID of the message being replied to
  reactions?: { [emoji: string]: string[] }; // emoji -> array of usernames
  callInfo?: {
    type: 'missed-audio' | 'missed-video' | 'ended-audio' | 'ended-video';
    duration: number;
    caller: string;
    receiver: string;
  };
}

export type ChatTarget = { type: 'group' } | { type: 'private'; with: string };