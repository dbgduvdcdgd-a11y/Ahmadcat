export interface MessageFile {
    name: string;
    type: 'image' | 'video';
    url: string; // Base64 data URL
}

export interface Message {
  id: string;
  sender: string;
  text?: string; // Optional text content or caption
  file?: MessageFile;
}
