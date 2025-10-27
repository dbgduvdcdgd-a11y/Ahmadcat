import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';
import type { Message } from './types';
import { initializeAdmin, login } from './services/authService';

const CHAT_MESSAGES_KEY = 'group-chat-messages';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    initializeAdmin();
  }, []);

  const handleLogin = useCallback(async (name: string, pass: string): Promise<boolean> => {
    // Add a 2-second delay
    await new Promise(resolve => setTimeout(resolve, 2000));
      
    const trimmedName = name.trim();
    const success = login(trimmedName, pass);

    if (success) {
      // Add a 'joined' message to localStorage to notify other users
      try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
        const systemMessage: Message = {
            id: Date.now().toString(),
            text: `انضم ${trimmedName} إلى الدردشة`,
            sender: 'System'
        };
        const updatedMessages = [...currentMessages, systemMessage];
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(updatedMessages));
      } catch(e) {
          console.error("Could not add join message", e);
      }

      setUsername(trimmedName);
      setIsAuthenticated(true);
    }
    
    return success;
  }, []);

  const handleLogout = useCallback(async () => {
    // Add a 2-second delay
    await new Promise(resolve => setTimeout(resolve, 2000));

     // Add a 'left' message to localStorage
     try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
        const systemMessage: Message = {
            id: Date.now().toString(),
            text: `غادر ${username} الدردشة`,
            sender: 'System'
        };
        const updatedMessages = [...currentMessages, systemMessage];
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(updatedMessages));
      } catch(e) {
          console.error("Could not add leave message", e);
      }

    setIsAuthenticated(false);
    setUsername('');
  }, [username]);
  
  const handleUsernameUpdate = (newUsername: string) => {
    setUsername(newUsername);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <ChatScreen username={username} onLogout={handleLogout} onUsernameUpdate={handleUsernameUpdate} />;
};

export default App;