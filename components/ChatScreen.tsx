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
const REACTION_EMOJIS = ['😡', '😘', '🔥', '😎'];

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
    if (message.reactions && Object.keys(message.reactions).length > 0) return 'تفاعل';
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
                     <audio controls src={message.file.url} className="w-full" />
                ) : (
                    <div 
                        className="cursor-pointer"
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
  const [popoverMessageId, setPopoverMessageId] = useState<string | null>(null);

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

  // Close popover when clicking away
  useEffect(() => {
    const closePopover = () => setPopoverMessageId(null);
    if (popoverMessageId) {
        document.addEventListener('click', closePopover);
    }
    return () => {
        document.removeEventListener('click', closePopover);
    };
}, [popoverMessageId]);

  const addNewMessage = useCallback((message: Message) => {
    try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(currentChatKey) || '[]');
        const updatedMessages = [...currentMessages, message];
        localStorage.setItem(currentChatKey, JSON.stringify(updatedMessages));
        // Manually update state for the sender's screen
        setMessages(updatedMessages);
    } catch (e) {
        console.error("Could not send message", e);
    }
  }, [currentChatKey]);

  const addGroupSystemMessage = useCallback((text: string) => {
    try {
        const currentMessages: Message[] = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
        const systemMessage: Message = {
            id: Date.now().toString(),
            sender: 'System',
            text,
        };
        const updatedMessages = [...currentMessages, systemMessage];
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(updatedMessages));
        
        if (currentChat.type === 'group') {
            setMessages(updatedMessages);
        }
    } catch (e) {
        console.error("Could not add system message", e);
    }
  }, [currentChat.type]);


  const sendMessage = () => {
    if (!newMessage.trim() && !replyingTo) return;
    const message: Message = {
      id: Date.now().toString(),
      sender: username,
      text: newMessage.trim(),
      replyTo: replyingTo?.id,
    };
    addNewMessage(message);
    setNewMessage('');
    setReplyingTo(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        setFileError(`حجم الملف كبير جدًا. الحد الأقصى ${MAX_FILE_SIZE / 1024 / 1024} ميجابايت.`);
        setTimeout(() => setFileError(''), 5000);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const url = e.target?.result as string;
        const type: 'image' | 'video' = file.type.startsWith('image/') ? 'image' : 'video';
        
        const message: Message = {
            id: Date.now().toString(),
            sender: username,
            file: { name: file.name, type, url },
            text: newMessage, // Add current text as caption
        };
        addNewMessage(message);
        setNewMessage(''); // Clear input after sending
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

       if (file.size > MAX_AVATAR_SIZE) {
           alert(`حجم الصورة الرمزية كبير جدًا. الحد الأقصى ${MAX_AVATAR_SIZE / 1024 / 1024} ميجابايت.`);
           return;
       }
       if (!file.type.startsWith('image/')) {
           alert('يرجى تحديد ملف صورة.');
           return;
       }

      const reader = new FileReader();
      reader.onload = (e) => {
          const url = e.target?.result as string;
          profileService.setProfilePicture(username, url);
          setAvatar(url);
      };
      reader.readAsDataURL(file);
  };
  
    const handleLogout = async () => {
        setIsLoggingOut(true);
        await onLogout();
        // This component will unmount, so no need to setIsLoggingOut(false)
    };

    const handleProfileUpdate = (newUsername: string) => {
        // Renaming in profiles
        profileService.renameUserProfile(username, newUsername);
        
        // Update app's state
        onUsernameUpdate(newUsername);

        // Update local state for avatar
        setAvatar(profileService.getProfilePicture(newUsername));
        
        // Force refresh profile pictures cache in state
        setProfilePictures(prev => {
            const newPics = {...prev};
            if(newPics[username]) {
                newPics[newUsername] = newPics[username];
                delete newPics[username];
            }
            return newPics;
        });

        // Add a system message about the name change
        if (currentChat.type === 'group') {
            const systemMessage: Message = {
                id: Date.now().toString(),
                sender: 'System',
                text: `${username} غير اسمه إلى ${newUsername}`
            };
            addNewMessage(systemMessage);
        }
        
        setIsProfilePanelOpen(false); // Close panel on success
    };

    const handleUserDeleted = (deletedUsername: string) => {
        addGroupSystemMessage(`المسؤول حذف المستخدم ${deletedUsername}`);
        // Clean up profile picture cache
        setProfilePictures(prev => {
            const newPics = {...prev};
            if (newPics[deletedUsername]) {
                delete newPics[deletedUsername];
            }
            return newPics;
        });
    };
    
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                const message: Message = {
                    id: Date.now().toString(),
                    sender: username,
                    file: { name: 'voice-message.wav', type: 'audio', url: audioUrl }
                };
                addNewMessage(message);
                 // Stop all tracks to turn off microphone indicator
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setFileError("لا يمكن الوصول إلى الميكروفون.");
            setTimeout(() => setFileError(''), 3000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
    
    const handleSendSticker = (url: string) => {
        const message: Message = {
            id: Date.now().toString(),
            sender: username,
            sticker: url
        };
        addNewMessage(message);
        setIsStickerPanelOpen(false);
    };

    const handleReply = (message: Message) => {
        if (message.sender !== 'System') {
            setReplyingTo(message);
            setPopoverMessageId(null);
        }
    };

    const handleMessageLongPressStart = (message: Message) => {
        if (message.sender === 'System') return; // Don't show menu for system messages
        longPressTimerRef.current = setTimeout(() => {
            setPopoverMessageId(message.id);
        }, 500); // 500ms for a long press
    };

    const handleMessageLongPressEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    };

    const handleReaction = (messageId: string, emoji: string) => {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const updatedMessages = [...messages];
        const message = { ...updatedMessages[messageIndex] };
        
        message.reactions = message.reactions || {};
        message.reactions[emoji] = message.reactions[emoji] || [];
    
        const userIndex = message.reactions[emoji].indexOf(username);
    
        if (userIndex > -1) {
            message.reactions[emoji].splice(userIndex, 1);
            if (message.reactions[emoji].length === 0) {
                delete message.reactions[emoji];
            }
        } else {
            message.reactions[emoji].push(username);
        }
        
        updatedMessages[messageIndex] = message;
    
        try {
            localStorage.setItem(currentChatKey, JSON.stringify(updatedMessages));
            setMessages(updatedMessages);
        } catch (e) {
            console.error("Could not update reactions", e);
        }
    };

    const handleDeleteMessage = (messageId: string) => {
        const messageToDelete = messages.find(m => m.id === messageId);
        if (!messageToDelete) return;

        if (messageToDelete.sender !== username && username !== 'admin') {
            return; // Should not happen due to UI, but for safety
        }
        
        if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟ سيتم حذفها لدى الجميع.')) {
            setPopoverMessageId(null);
            return;
        }

        try {
            const currentMessages: Message[] = JSON.parse(localStorage.getItem(currentChatKey) || '[]');
            const updatedMessages = currentMessages.filter(m => m.id !== messageId);
            localStorage.setItem(currentChatKey, JSON.stringify(updatedMessages));
            setMessages(updatedMessages);
            setPopoverMessageId(null); // Close the popover
        } catch (e) {
            console.error("Could not delete message", e);
        }
    };

  const getReplyingToMessage = (replyToId?: string): Message | undefined => {
      if (!replyToId) return undefined;
      return messages.find(m => m.id === replyToId);
  }

  const getChatTitle = () => {
      if (currentChat.type === 'group') {
          return 'مجموعة الأصدقاء';
      }
      return `محادثة مع ${currentChat.with}`;
  };


  return (
    <div className="flex h-screen bg-slate-800 antialiased text-slate-200">
        <div className="flex flex-col h-full w-full">

            {/* Header */}
            <header className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-900 flex-shrink-0">
                 <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setIsUserListOpen(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                    <h2 className="text-lg font-bold truncate">{getChatTitle()}</h2>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                     <button onClick={() => avatarInputRef.current?.click()} className="relative group">
                         {avatar ? (
                            <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 group-hover:opacity-80 transition-opacity" />
                         ) : (
                            <div className={`w-10 h-10 rounded-full ${nameToColor(username)} flex items-center justify-center font-bold text-white text-lg border-2 border-slate-600 group-hover:opacity-80 transition-opacity`}>
                                {username.charAt(0).toUpperCase()}
                            </div>
                         )}
                         <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                         </div>
                    </button>
                     <input
                        type="file"
                        ref={avatarInputRef}
                        onChange={handleAvatarChange}
                        className="hidden"
                        accept="image/*"
                    />

                    <div className="relative group">
                        <button className="p-2 rounded-full hover:bg-slate-700 transition-colors" id="menu-button" aria-expanded="true" aria-haspopup="true">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </button>
                        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-slate-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto" role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex={-1}>
                            <div className="py-1" role="none">
                                <button onClick={() => setIsProfilePanelOpen(true)} className="text-slate-100 block w-full text-right px-4 py-2 text-sm hover:bg-slate-600" role="menuitem" tabIndex={-1}>إعدادات الحساب</button>
                                {username === 'admin' && <button onClick={() => setIsUserPanelOpen(true)} className="text-slate-100 block w-full text-right px-4 py-2 text-sm hover:bg-slate-600" role="menuitem" tabIndex={-1}>إدارة المستخدمين</button>}
                                <button onClick={handleLogout} disabled={isLoggingOut} className="text-red-400 block w-full text-right px-4 py-2 text-sm hover:bg-slate-600 disabled:opacity-50" role="menuitem" tabIndex={-1}>
                                    {isLoggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4" onClick={() => setPopoverMessageId(null)}>
                {messages.map((msg) => (
                    msg.sender === 'System' ? (
                        <div key={msg.id} className="text-center text-sm text-slate-400 py-2">
                           {msg.text}
                        </div>
                    ) : (
                        <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === username ? 'flex-row-reverse' : ''}`}
                            onTouchStart={(e) => { e.stopPropagation(); handleMessageLongPressStart(msg); }}
                            onTouchEnd={handleMessageLongPressEnd}
                            onMouseDown={(e) => { e.stopPropagation(); handleMessageLongPressStart(msg); }}
                            onMouseUp={handleMessageLongPressEnd}
                            onMouseLeave={handleMessageLongPressEnd}
                        >
                            <div className="flex-shrink-0">
                                {profilePictures[msg.sender] ? (
                                    <img src={profilePictures[msg.sender]!} alt={msg.sender} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                     <div className={`w-8 h-8 rounded-full ${nameToColor(msg.sender)} flex items-center justify-center font-bold text-white text-sm`}>
                                        {msg.sender.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className={`flex flex-col max-w-xl relative ${msg.sender === username ? 'items-end' : 'items-start'}`}>
                                 {popoverMessageId === msg.id && (
                                    <div 
                                        className={`absolute z-20 bottom-full mb-1 flex items-center gap-1 bg-slate-800 p-1.5 rounded-full shadow-lg border border-slate-700 ${msg.sender === username ? 'right-0' : 'left-0'}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {REACTION_EMOJIS.map(emoji => (
                                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="p-1 rounded-full hover:bg-slate-600 transition-transform transform active:scale-125 text-xl">
                                                {emoji}
                                            </button>
                                        ))}
                                        <div className="w-px h-5 bg-slate-600 mx-1"></div>
                                        <button onClick={() => handleReply(msg)} className="p-1 rounded-full hover:bg-slate-600 transition-colors" title="رد">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        </button>
                                        {(msg.sender === username || username === 'admin') && (
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 rounded-full text-red-400 hover:bg-slate-600 transition-colors" title="حذف">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className={`px-4 py-2 rounded-2xl ${msg.sender === username ? 'bg-indigo-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                                    <span className={`text-xs font-bold ${msg.sender === username ? 'text-indigo-200' : 'text-slate-400'} block mb-1`}>{msg.sender}</span>
                                    
                                    {getReplyingToMessage(msg.replyTo) && (
                                        <div className="mb-2 p-2 border-r-2 border-indigo-400 bg-black/20 rounded-md opacity-80">
                                            <p className="text-xs font-bold text-indigo-300">{getReplyingToMessage(msg.replyTo)?.sender}</p>
                                            <p className="text-xs text-slate-300 truncate">{getMessageSnippet(getReplyingToMessage(msg.replyTo)!)}</p>
                                        </div>
                                    )}

                                    <MessageContent message={msg} onViewMedia={setViewingMedia} />
                                </div>
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                    <div className={`flex gap-1.5 mt-1.5 flex-wrap ${msg.sender === username ? 'justify-end' : 'justify-start'}`}>
                                        {Object.entries(msg.reactions).map(([emoji, senders]) => {
                                            // FIX: Cast senders to string[] to resolve TypeScript error where it's inferred as 'unknown'.
                                            const senderList = senders as string[];
                                            if (senderList.length === 0) {
                                                return null;
                                            }
                                            return (
                                                <div key={emoji} className="bg-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 cursor-pointer" title={senderList.join(', ')}>
                                                    <span>{emoji}</span>
                                                    <span className="text-slate-300 font-medium">{senderList.length}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                ))}
                <div ref={messagesEndRef} />
            </main>
            
            {fileError && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-800 text-red-100 text-sm px-4 py-2 rounded-md shadow-lg">{fileError}</div>}


            {/* Input */}
            <footer className="p-3 border-t border-slate-700 bg-slate-900 flex-shrink-0">
                {replyingTo && (
                    <div className="mb-2 flex justify-between items-center p-2 bg-slate-800 rounded-md">
                        <div className="flex-1 overflow-hidden">
                           <p className="text-xs font-bold text-indigo-300">الرد على {replyingTo.sender}</p>
                           <p className="text-sm text-slate-300 truncate">{getMessageSnippet(replyingTo)}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className="relative flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setIsStickerPanelOpen(prev => !prev)}
                            className="p-2 rounded-full hover:bg-slate-700 transition-colors"
                            aria-label="إرسال ملصق"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a.5.5 0 01.707 0 5 5 0 01-7.07 0 .5.5 0 01.707-.707 4 4 0 005.656 0 .5.5 0 01.707.707z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {isStickerPanelOpen && (
                            <div className="absolute bottom-full mb-2 left-0 z-20">
                                <StickerPanel onSelectSticker={handleSendSticker} onClose={() => setIsStickerPanelOpen(false)} />
                            </div>
                        )}
                    </div>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,video/*"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="إرفاق ملف">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="اكتب رسالة..."
                        className="w-full bg-slate-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {isRecording ? (
                        <button onClick={stopRecording} className="p-2 rounded-full bg-red-600 text-white animate-pulse" aria-label="إيقاف التسجيل">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    ) : (
                         <button onClick={startRecording} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="تسجيل رسالة صوتية">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                                <path d="M5.5 11.5a.5.5 0 01.5-.5h8a.5.5 0 010 1h-8a.5.5 0 01-.5-.5z" />
                                <path d="M3 8a1 1 0 000 2h1v2a4 4 0 008 0V10h1a1 1 0 100-2H3z" />
                            </svg>
                        </button>
                    )}
                    <button onClick={sendMessage} className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors" aria-label="إرسال">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>
            </footer>
        </div>

        {/* Modals */}
        {isUserPanelOpen && <UserManagementPanel onClose={() => setIsUserPanelOpen(false)} onUserDeleted={handleUserDeleted} />}
        {isProfilePanelOpen && (
            <ProfileSettingsPanel 
                username={username} 
                onClose={() => setIsProfilePanelOpen(false)}
                onUsernameChangeSuccess={handleProfileUpdate}
                onAccountDeleted={onLogout}
            />
        )}
        {isUserListOpen && <UserListPanel currentUser={username} onClose={() => setIsUserListOpen(false)} onSelectChat={setCurrentChat} />}


        {viewingMedia && (
            <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" onClick={() => setViewingMedia(null)}>
                <div className="max-w-4xl max-h-[90vh] relative">
                     <button onClick={() => setViewingMedia(null)} className="absolute -top-10 right-0 text-white text-2xl z-10">&times;</button>
                     {viewingMedia.type === 'image' ? (
                        <img src={viewingMedia.url} alt={viewingMedia.name} className="max-w-full max-h-[90vh] object-contain" />
                     ) : (
                        <video src={viewingMedia.url} controls autoPlay className="max-w-full max-h-[90vh]" />
                     )}
                </div>
            </div>
        )}
    </div>
  );
};

export default ChatScreen;