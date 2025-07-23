export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}