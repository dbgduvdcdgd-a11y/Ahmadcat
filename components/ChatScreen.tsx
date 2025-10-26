import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Message, MessageFile, ChatTarget } from '../types';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import ProfileSettingsPanel from './ProfileSettingsPanel';
import UserManagementPanel from './UserManagementPanel';
import UserListPanel from './UserListPanel';
import StickerPanel from './StickerPanel';


const CHAT_MESSAGES_KEY = 'group-chat-messages';
const PRIVATE_CHAT_PREFIX = 'private-chat-';
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

const linkify = (text: string) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.split(urlRegex).map((part, i) => 
        urlRegex.test(part) 
            ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a> 
            : part
    );
};

const getMessageSnippet = (message: Message): string => {
    if (message.text) return message.text;
    if (message.file) {
        if (message.file.type === 'image') return 'صورة';
        if (message.file.type === 'video') return 'فيديو';
        if (message.file.type === 'audio') return 'رسالة صوتية';
        return message.file.name;
    }
    if (message.sticker) return 'ملصق';
    return 'رسالة';
};


const MessageContent: React.FC<{ message: Message; onViewMedia: (file: MessageFile) => void; }> = ({ message, onViewMedia }) => {
    return (
        <div className="flex flex-col gap-2">
             {message.sticker && (
                <img src={message.sticker} alt="ملصق" className="w-28 h-28 object-contain" />
            )}
            {message.file && (
                message.file.type === 'audio' ? (
                     <audio controls src={message.file.url} className="w-full max-w-xs" />
                ) : (
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
                )
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
  onLogout: () => Promise<void>;
  onUsernameUpdate: (newUsername: string) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ username, onLogout, onUsernameUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [fileError, setFileError] = useState('');
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isStickerPanelOpen, setIsStickerPanelOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MessageFile | null>(null);
  const [avatar, setAvatar] = useState<string | null>(() => profileService.getProfilePicture(username));
  const [profilePictures, setProfilePictures] = useState<Record<string, string | null>>({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentChat, setCurrentChat] = useState<ChatTarget>({ type: 'group' });
  const [isRecording, setIsRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getChatKey = useCallback((target: ChatTarget): string => {
    if (target.type === 'group') {
        return CHAT_MESSAGES_KEY;
    }
    const participants = [username, target.with].sort();
    return `${PRIVATE_CHAT_PREFIX}${participants[0]}-${participants[1]}`;
  }, [username]);
  
  const currentChatKey = getChatKey(currentChat);

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
    try {
        const storedMessages = localStorage.getItem(currentChatKey);
        setMessages(storedMessages ? (JSON.parse(storedMessages) as Message[]) : []);
    } catch {
        setMessages([]);
    }
  }, [currentChatKey]);
  
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === currentChatKey && event.newValue) {
            try { 
                setMessages(JSON.parse(event.newValue) as Message[]);
            } 
            catch (error) { console.error("Error parsing messages from storage", error); }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentChatKey]);

  const addNewMessage = useCallback((message: Message) => {
    try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(currentChatKey) || '[]');
        const updatedMessages = [...currentMessages, message];
        
        localStorage.setItem(currentChatKey, JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
    } catch (error) {
        console.error("Error saving message to localStorage", error);
    }
  }, [currentChatKey]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: username,
      ...(replyingTo && { replyTo: replyingTo.id }),
    };
    
    addNewMessage(userMessage);
    setNewMessage('');
    setReplyingTo(null);
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
            ...(newMessage.trim() && { text: newMessage.trim() }),
            ...(replyingTo && { replyTo: replyingTo.id }),
        };
        addNewMessage(message);
        setNewMessage('');
        setReplyingTo(null);
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
    profileService.renameUserProfile(username, newUsername);
    const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
    const updatedMessages = currentMessages.map(msg =>
        msg.sender === username ? { ...msg, sender: newUsername } : msg
    );
    const systemMessage: Message = {
        id: Date.now().toString(),
        text: `${username} غير اسمه إلى ${newUsername}`,
        sender: 'System'
    };
    const finalMessages = [...updatedMessages, systemMessage];
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(finalMessages));
    setMessages(finalMessages);
    onUsernameUpdate(newUsername);
    setIsProfilePanelOpen(false);
  };

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await onLogout();
  };

  const handleSelectChat = (target: ChatTarget) => {
    if (target.type === 'private' && target.with === username) return;
    setCurrentChat(target);
    setNewMessage('');
    setIsUserListOpen(false);
  };

  const handleSelectSticker = (stickerUrl: string) => {
    const stickerMessage: Message = {
        id: Date.now().toString(),
        sender: username,
        sticker: stickerUrl,
        ...(replyingTo && { replyTo: replyingTo.id }),
    };
    addNewMessage(stickerMessage);
    setIsStickerPanelOpen(false);
    setReplyingTo(null);
  };

  const handleStartRecording = async () => {
    setFileError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFileError('متصفحك لا يدعم تسجيل الصوت.');
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileUrl = event.target?.result as string;
                const message: Message = {
                    id: Date.now().toString(),
                    sender: username,
                    file: {
                        name: `voice-message-${Date.now()}.webm`,
                        type: 'audio',
                        url: fileUrl
                    },
                    ...(replyingTo && { replyTo: replyingTo.id }),
                };
                addNewMessage(message);
                setReplyingTo(null);
            };
            reader.readAsDataURL(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing microphone:", err);
        setFileError('لم يتم منح الإذن للوصول إلى الميكروفون.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
        handleStopRecording();
    } else {
        handleStartRecording();
    }
  };

    const handlePressStart = (e: React.MouseEvent | React.TouchEvent, message: Message) => {
        if (message.sender === 'System' || (e.target as HTMLElement).closest('a, button, audio, video')) return;

        longPressTimerRef.current = setTimeout(() => {
            setReplyingTo(message);
            longPressTimerRef.current = null;
        }, 500);
    };

    const handlePressEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleReplyClick = (messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-message');
            setTimeout(() => {
                element.classList.remove('highlight-message');
            }, 1500);
        }
    };


  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {isUserPanelOpen && <UserManagementPanel onClose={() => setIsUserPanelOpen(false)} />}
      {isProfilePanelOpen && <ProfileSettingsPanel username={username} onClose={() => setIsProfilePanelOpen(false)} onUsernameChangeSuccess={handleUsernameChangeSuccess} />}
      {isUserListOpen && <UserListPanel currentUser={username} onClose={() => setIsUserListOpen(false)} onSelectChat={handleSelectChat} />}
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
            <h2 className="hidden sm:inline text-lg sm:text-xl font-semibold text-white truncate">
                {currentChat.type === 'group' ? 'مجموعة الأصدقاء' : `محادثة مع ${currentChat.with}`}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
                onClick={() => setIsUserListOpen(true)}
                title="المستخدمون"
                className="p-2 sm:px-4 sm:py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors duration-200 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                <span className="hidden sm:inline">المستخدمون</span>
            </button>
            {username === 'admin' && (
                <button
                    onClick={() => setIsUserPanelOpen(true)}
                    title="إدارة الحسابات"
                    className="p-2 sm:px-4 sm:py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors duration-200 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                       <path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zm-5 5a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm10 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm-5 5a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm-5 5a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm10 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" />
                       <path d="M4 1.5A2.5 2.5 0 001.5 4v12A2.5 2.5 0 004 18.5h12a2.5 2.5 0 002.5-2.5V4A2.5 2.5 0 0016 1.5H4zM3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="hidden sm:inline">الإدارة</span>
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
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-200 transform active:scale-95 active:brightness-90 disabled:bg-indigo-500 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
            >
                {isLoggingOut ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        الخروج...
                    </>
                ) : (
                    'تسجيل الخروج'
                )}
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((message) => {
              const isUser = message.sender === username;
              const isStickerMessage = !!message.sticker;
              const originalMessage = message.replyTo ? messages.find(m => m.id === message.replyTo) : null;

              if (message.sender === 'System') {
                  return (
                      <div key={message.id} className="text-center my-2">
                          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">{message.text}</span>
                      </div>
                  );
              }
              const senderAvatar = isUser ? avatar : profilePictures[message.sender];
              return (
                <div key={message.id} id={`message-${message.id}`} className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
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
                     <div
                        className={`cursor-pointer ${isStickerMessage ? 'p-1' : ''}`}
                        onMouseDown={(e) => handlePressStart(e, message)}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={(e) => handlePressStart(e, message)}
                        onTouchEnd={handlePressEnd}
                     >
                        {isStickerMessage ? (
                             <MessageContent message={message} onViewMedia={setViewingMedia} />
                        ) : (
                            <div className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl ${
                                isUser
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-slate-700 text-slate-100 rounded-bl-none'
                            }`}>
                            {originalMessage && (
                                <button
                                    onClick={() => handleReplyClick(originalMessage.id)}
                                    className="w-full text-right p-2 mb-2 bg-black bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors border-l-2 border-indigo-400"
                                >
                                    <p className="font-bold text-sm text-indigo-300">{originalMessage.sender}</p>
                                    <p className="text-xs text-slate-300 truncate">{getMessageSnippet(originalMessage)}</p>
                                </button>
                            )}
                            <MessageContent message={message} onViewMedia={setViewingMedia} />
                            </div>
                        )}
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

        <footer className="bg-slate-800 border-t border-slate-700 relative">
          <div className="absolute bottom-full right-2 sm:right-4 mb-2 z-20">
            {isStickerPanelOpen && <StickerPanel onSelectSticker={handleSelectSticker} onClose={() => setIsStickerPanelOpen(false)} />}
          </div>
           {replyingTo && (
            <div className="p-2 px-4 bg-slate-700 border-b border-slate-600 flex items-center justify-between text-sm">
              <div className="flex-1 overflow-hidden">
                <p className="text-indigo-400 font-semibold">
                  الرد على {replyingTo.sender === username ? 'نفسك' : replyingTo.sender}
                </p>
                <p className="text-slate-300 truncate">{getMessageSnippet(replyingTo)}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full"
                aria-label="إلغاء الرد"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="p-2 sm:p-4">
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
                <button
                type="button"
                onClick={() => setIsStickerPanelOpen(prev => !prev)}
                className="p-2 sm:p-3 bg-slate-700 rounded-full text-slate-300 hover:bg-slate-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-200"
                aria-label="إرسال ملصق"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-400 text-sm"
                />
                {newMessage.trim() === '' ? (
                    <button
                        type="button"
                        onClick={toggleRecording}
                        className={`p-2 sm:p-3 rounded-full text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 ${
                            isRecording ? 'bg-red-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                        aria-label={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل الصوتي'}
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                ) : (
                    <button
                    type="submit"
                    className="p-2 sm:p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-200"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 transform rotate-180" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    </button>
                )}
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatScreen;