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

  const handleLogin = useCallback((name: string, pass: string): boolean => {
    const trimmedName = name.trim();
    const success = login(trimmedName, pass);

    if (success) {
      // Add a 'joined' message to localStorage to notify other users
      try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
        const systemMessage: Message = {
            id: Date.now().toString(),
            text: `${trimmedName} انضم إلى الدردشة`,
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

  const handleLogout = useCallback(() => {
     // Add a 'left' message to localStorage
     try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
        const systemMessage: Message = {
            id: Date.now().toString(),
            text: `${username} غادر الدردشة`,
            sender: 'System'
        };
        const updatedMessages = [...currentMessages, systemMessage];
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(updatedMessages));
    } catch (e) {
        console.error("Could not add leave message", e);
    }

    setUsername('');
    setIsAuthenticated(false);
  }, [username]);

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      {isAuthenticated ? (
        <ChatScreen username={username} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;