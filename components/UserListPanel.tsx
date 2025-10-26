import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import type { ChatTarget } from '../types';

interface UserListPanelProps {
    currentUser: string;
    onClose: () => void;
    onSelectChat: (target: ChatTarget) => void;
}

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


const UserListPanel: React.FC<UserListPanelProps> = ({ currentUser, onClose, onSelectChat }) => {
    const [users, setUsers] = useState<string[]>([]);
    const [profilePictures, setProfilePictures] = useState<Record<string, string | null>>({});

    useEffect(() => {
        const allUsers = authService.getUsers().filter(u => u !== currentUser);
        setUsers(allUsers);

        const pics: Record<string, string | null> = {};
        for (const user of allUsers) {
            pics[user] = profileService.getProfilePicture(user);
        }
        setProfilePictures(pics);
    }, [currentUser]);
    
    const handleSelect = (target: ChatTarget) => {
        onSelectChat(target);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-xl font-bold text-white">بدء محادثة</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <div className="p-2 flex-1 overflow-y-auto">
                    <ul className="space-y-1">
                        {/* Group Chat option */}
                        <li>
                            <button 
                                onClick={() => handleSelect({ type: 'group' })}
                                className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-slate-700 transition-colors duration-200"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center font-bold text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <span className="font-semibold text-white">مجموعة الأصدقاء</span>
                                    <p className="text-sm text-slate-400">الدردشة العامة</p>
                                </div>
                            </button>
                        </li>
                        
                        {/* Divider */}
                        <div className="px-3 py-2">
                             <div className="border-t border-slate-700"></div>
                        </div>

                        {/* Private Chat options */}
                        {users.map(user => (
                            <li key={user}>
                                <button 
                                    onClick={() => handleSelect({ type: 'private', with: user })}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-slate-700 transition-colors duration-200"
                                >
                                    <div className="relative w-10 h-10 flex-shrink-0">
                                        {profilePictures[user] ? (
                                            <img src={profilePictures[user]!} alt={user} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full ${nameToColor(user)} flex items-center justify-center font-bold text-white`}>
                                                {user.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                         <span className="font-semibold text-white">{user}</span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default UserListPanel;
