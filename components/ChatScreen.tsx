import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Message, MessageFile } from '../types';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import ProfileSettingsPanel from './ProfileSettingsPanel';


const CHAT_MESSAGES_KEY = 'group-chat-messages';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1MB

const nameToColor = (name: string): string => {
    let hash = 0;
    if (name.length === 0) return 'bg-gray-500';
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    const colors = [
        'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
        'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
    ];
    return colors[Math.abs(hash) % colors.length];
};

const UserManagementPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [users, setUsers] = useState<Array<{ username: string; password: string }>>([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    const loadUsers = useCallback(() => {
        setUsers(authService.getUsersWithPasswords());
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        const result = authService.registerUser(newUsername, newPassword);
        setMessage(result.message);
        setMessageType(result.success ? 'success' : 'error');

        if (result.success) {
            setNewUsername('');
            setNewPassword('');
            loadUsers();
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const messageColor = messageType === 'success' ? 'text-green-300 bg-green-900' : 'text-red-300 bg-red-900';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-xl font-bold text-white">إدارة الحسابات</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="bg-slate-900 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-white mb-3">توليد حساب جديد</h4>
                        {message && <p className={`text-sm mb-3 p-2 rounded-md bg-opacity-50 ${messageColor}`}>{message}</p>}
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label htmlFor="newUsernameModal" className="block text-sm font-medium text-slate-300 mb-1">اسم المستخدم الجديد</label>
                                <input type="text" id="newUsernameModal" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required minLength={3} />
                            </div>
                             <div>
                                <label htmlFor="newPasswordModal"  className="block text-sm font-medium text-slate-300 mb-1">كلمة المرور الجديدة</label>
                                <input type="password" id="newPasswordModal" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required minLength={6} />
                            </div>
                            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors duration-200">
                                إنشاء حساب
                            </button>
                        </form>
                    </div>

                    <div className="mt-6">
                        <h4 className="text-lg font-semibold text-white mb-3">المستخدمون المسجلون ({users.length})</h4>
                         <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {users.map(({ username, password }) => (
                                <div key={username} className="bg-slate-700 p-2 rounded-md text-sm flex justify-between items-center gap-2">
                                    <span className="font-semibold truncate flex-1" title={username}>{username}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">كلمة المرور:</span>
                                        <span className="font-mono text-indigo-300 truncate">{password}</span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(password)}
                                            title="نسخ كلمة المرور"
                                            className="p-1 text-slate-400 hover:text-white transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const linkify = (text: string) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.split(urlRegex).map((part, i) => 
        urlRegex.test(part) 
            ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a> 
            : part
    );
};

const MessageContent: React.FC<{ message: Message; onViewMedia: (file: MessageFile) => void; }> = ({ message, onViewMedia }) => {
    return (
        <div className="flex flex-col gap-2">
            {message.file && (
                <div 
                    className="max-w-xs cursor-pointer"
                    onClick={() => onViewMedia(message.file!)}
                >
                    {message.file.type === 'image' ? (
                        <img src={message.file.url} alt={message.file.name} className="max-w-full h-auto rounded-lg" />
                    ) : (
                        <video src={message.file.url} className="max-w-full h-auto rounded-lg" />
                    )}
                </div>
            )}
            {message.text && (
                <p className="text-sm whitespace-pre-wrap break-words">
                    {linkify(message.text)}
                </p>
            )}
        </div>
    );
};

interface ChatScreenProps {
  username: string;
  onLogout: () => void;
  onUsernameUpdate: (newUsername: string) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ username, onLogout, onUsernameUpdate }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const storedMessages = localStorage.getItem(CHAT_MESSAGES_KEY);
      return storedMessages ? (JSON.parse(storedMessages) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [newMessage, setNewMessage] = useState('');
  const [fileError, setFileError] = useState('');
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MessageFile | null>(null);
  const [avatar, setAvatar] = useState<string | null>(() => profileService.getProfilePicture(username));
  const [profilePictures, setProfilePictures] = useState<Record<string, string | null>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

    useEffect(() => {
        const senders: string[] = [...new Set<string>(messages.map(m => m.sender))].filter(s => s !== 'System');
        const picsToFetch: Record<string, string | null> = {};
        let needsUpdate = false;
        for (const sender of senders) {
            if (profilePictures[sender] === undefined) {
                picsToFetch[sender] = profileService.getProfilePicture(sender);
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            setProfilePictures(prev => ({ ...prev, ...picsToFetch }));
        }
    }, [messages, profilePictures]);
  
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === CHAT_MESSAGES_KEY && event.newValue) {
            try { 
                setMessages(JSON.parse(event.newValue) as Message[]);
            } 
            catch (error) { console.error("Error parsing messages from storage", error); }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addNewMessage = useCallback((message: Message) => {
    try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
        const updatedMessages = [...currentMessages, message];
        
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
    } catch (error) {
        console.error("Error saving message to localStorage", error);
    }
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: username,
    };
    
    addNewMessage(userMessage);
    setNewMessage('');
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');

    if (file.size > MAX_FILE_SIZE) {
        setFileError(`حجم الملف كبير جدًا. الحد الأقصى: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
    }

    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) {
        setFileError('نوع الملف غير مدعوم. الرجاء اختيار صورة أو فيديو.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const fileUrl = event.target?.result as string;
        const message: Message = {
            id: Date.now().toString(),
            sender: username,
            file: {
                name: file.name,
                type: fileType,
                url: fileUrl
            },
            ...(newMessage.trim() && { text: newMessage.trim() })
        };
        addNewMessage(message);
        setNewMessage('');
    };
    reader.onerror = () => {
        setFileError('حدث خطأ أثناء قراءة الملف.');
    };
    reader.readAsDataURL(file);
    
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');

    if (file.size > MAX_AVATAR_SIZE) {
        setFileError(`حجم الصورة كبير جدًا. الحد الأقصى: ${MAX_AVATAR_SIZE / 1024 / 1024}MB`);
        return;
    }

    if (!file.type.startsWith('image/')) {
        setFileError('الرجاء اختيار ملف صورة فقط.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        profileService.setProfilePicture(username, imageUrl);
        setAvatar(imageUrl);
    };
    reader.onerror = () => {
        setFileError('حدث خطأ أثناء قراءة الصورة.');
    };
    reader.readAsDataURL(file);
    
    if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
    }
  };

  const handleUsernameChangeSuccess = (newUsername: string) => {
    // 1. Rename profile
    profileService.renameUserProfile(username, newUsername);

    // 2. Update messages in localStorage
    const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
    const updatedMessages = currentMessages.map(msg =>
        msg.sender === username ? { ...msg, sender: newUsername } : msg
    );
    
    // 3. Add a system message about the name change
    const systemMessage: Message = {
        id: Date.now().toString(),
        text: `${username} غير اسمه إلى ${newUsername}`,
        sender: 'System'
    };
    const finalMessages = [...updatedMessages, systemMessage];
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(finalMessages));
    
    // 4. Update local and parent state
    setMessages(finalMessages);
    onUsernameUpdate(newUsername);
    
    // 5. Close the panel
    setIsProfilePanelOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {isUserPanelOpen && <UserManagementPanel onClose={() => setIsUserPanelOpen(false)} />}
      {isProfilePanelOpen && <ProfileSettingsPanel username={username} onClose={() => setIsProfilePanelOpen(false)} onUsernameChangeSuccess={handleUsernameChangeSuccess} />}
      {viewingMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" onClick={() => setViewingMedia(null)}>
            <button onClick={() => setViewingMedia(null)} className="absolute top-4 right-4 text-white text-4xl z-10" aria-label="إغلاق">&times;</button>
            <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                {viewingMedia.type === 'image' ? (
                    <img src={viewingMedia.url} alt={viewingMedia.name} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
                ) : (
                    <video src={viewingMedia.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg" />
                )}
            </div>
        </div>
      )}

      <div className="flex flex-col flex-1 h-full">
        <header className="flex items-center justify-between p-4 bg-slate-800 shadow-md z-10 border-b border-slate-700">
          <div className="flex items-baseline gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-500 to-pink-500">الحادي عشر عينابوس</h1>
            <span className="hidden sm:inline text-lg sm:text-xl font-medium text-slate-400">/</span>
            <h2 className="hidden sm:inline text-lg sm:text-xl font-semibold text-white">مجموعة الأصدقاء</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {username === 'admin' && (
                <button
                    onClick={() => setIsUserPanelOpen(true)}
                    title="إدارة الحسابات"
                    className="p-2 sm:px-4 sm:py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors duration-200 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                       <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <span className="hidden sm:inline">إدارة الحسابات</span>
                </button>
            )}
            <button
              onClick={() => setIsProfilePanelOpen(true)}
              title="إعدادات الحساب"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold group"
              title="تغيير الصورة الشخصية"
            >
                {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                    <span className={`w-full h-full rounded-full ${nameToColor(username)} flex items-center justify-center`}>
                        {username.charAt(0).toUpperCase()}
                    </span>
                )}
                 <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
            </button>
            <button
                onClick={onLogout}
                className="px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors duration-200"
            >
                تسجيل الخروج
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((message) => {
              const isUser = message.sender === username;
              if (message.sender === 'System') {
                  return (
                      <div key={message.id} className="text-center my-2">
                          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">{message.text}</span>
                      </div>
                  );
              }
              const senderAvatar = isUser ? avatar : profilePictures[message.sender];
              return (
                <div key={message.id} className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    senderAvatar ? (
                        <img src={senderAvatar} alt={message.sender} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                        <div className={`w-8 h-8 rounded-full ${nameToColor(message.sender)} flex-shrink-0 flex items-center justify-center font-bold text-white`}>
                            {message.sender.charAt(0).toUpperCase()}
                        </div>
                    )
                  )}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {!isUser && (
                      <span className="text-xs text-slate-400 mb-1 mx-2">{message.sender}</span>
                    )}
                    <div className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-700 text-slate-100 rounded-bl-none'
                      }`}>
                      <MessageContent message={message} onViewMedia={setViewingMedia} />
                    </div>
                  </div>
                   {isUser && (
                     avatar ? (
                        <img src={avatar} alt={username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                        <div className={`w-8 h-8 rounded-full ${nameToColor(username)} flex-shrink-0 flex items-center justify-center font-bold text-white`}>
                            {username.charAt(0).toUpperCase()}
                        </div>
                    )
                  )}
                </div>
              );
          })}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-2 sm:p-4 bg-slate-800 border-t border-slate-700">
          {fileError && <div className="p-2 mb-2 text-sm text-red-200 bg-red-800 bg-opacity-50 border border-red-700 rounded-md text-center" role="alert">{fileError}</div>}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-3 bg-slate-700 rounded-full text-slate-300 hover:bg-slate-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-200"
              aria-label="إرفاق ملف"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-400 text-sm"
            />
            <button
              type="submit"
              className="p-2 sm:p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 transform rotate-180" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default ChatScreen;