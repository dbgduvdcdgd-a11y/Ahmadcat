import React, { useState, useRef, useEffect } from 'react';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';

interface ProfileSettingsPanelProps {
    username: string;
    onClose: () => void;
    onUsernameChangeSuccess: (newUsername: string) => void;
    onAccountDeleted: () => void;
    onAvatarUpdate: () => void;
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

const ProfileSettingsPanel: React.FC<ProfileSettingsPanelProps> = ({ username, onClose, onUsernameChangeSuccess, onAccountDeleted, onAvatarUpdate }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [usernameMessage, setUsernameMessage] = useState({ text: '', type: 'success' });

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: 'success' });

    const [deletePassword, setDeletePassword] = useState('');
    const [deleteMessage, setDeleteMessage] = useState({ text: '', type: 'success' });
    
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [currentAvatar, setCurrentAvatar] = useState(() => profileService.getProfilePicture(username));
    const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1MB

    useEffect(() => {
        setCurrentAvatar(profileService.getProfilePicture(username));
    }, [username]);

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
          setCurrentAvatar(url);
          onAvatarUpdate();
      };
      reader.readAsDataURL(file);
    };


    const handleUsernameChange = (e: React.FormEvent) => {
        e.preventDefault();
        setUsernameMessage({ text: '', type: 'success' });
        const result = authService.changeUsername(username, newUsername, currentPassword);
        setUsernameMessage({ text: result.message, type: result.success ? 'success' : 'error' });

        if (result.success) {
            onUsernameChangeSuccess(newUsername.trim());
            // Parent will handle closing
        }
    };
    
    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage({ text: '', type: 'success' });
        const result = authService.changePassword(username, oldPassword, newPassword);
        setPasswordMessage({ text: result.message, type: result.success ? 'success' : 'error' });

        if (result.success) {
            setOldPassword('');
            setNewPassword('');
            setTimeout(() => setPasswordMessage({ text: '', type: 'success' }), 3000);
        }
    };

    const handleAccountDelete = (e: React.FormEvent) => {
        e.preventDefault();
        setDeleteMessage({ text: '', type: 'success' });
        
        if (!window.confirm('هل أنت متأكد تمامًا من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }

        const result = authService.deleteSelf(username, deletePassword);
        setDeleteMessage({ text: result.message, type: result.success ? 'success' : 'error' });

        if (result.success) {
            profileService.deleteUserProfile(username);
            setTimeout(() => {
                onAccountDeleted();
            }, 2000);
        }
    };
    
    const usernameMessageColor = usernameMessage.type === 'success' ? 'text-green-300 bg-green-900' : 'text-red-300 bg-red-900';
    const passwordMessageColor = passwordMessage.type === 'success' ? 'text-green-300 bg-green-900' : 'text-red-300 bg-red-900';
    const deleteMessageColor = deleteMessage.type === 'success' ? 'text-green-300 bg-green-900' : 'text-red-300 bg-red-900';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-xl font-bold text-white">إعدادات الحساب</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {/* Avatar Section */}
                    <div className="bg-slate-900 p-4 rounded-lg flex flex-col items-center">
                        <h4 className="text-lg font-semibold text-white mb-3">الصورة الرمزية</h4>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            onChange={handleAvatarChange}
                            className="hidden"
                            accept="image/*"
                        />
                        <button onClick={() => avatarInputRef.current?.click()} className="relative group">
                            {currentAvatar ? (
                                <img src={currentAvatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-slate-600 group-hover:opacity-80 transition-opacity" />
                            ) : (
                                <div className={`w-24 h-24 rounded-full ${nameToColor(username)} flex items-center justify-center font-bold text-white text-4xl border-4 border-slate-600 group-hover:opacity-80 transition-opacity`}>
                                    {username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </button>
                    </div>

                    {/* Change Username Form */}
                    <div className="bg-slate-900 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-white mb-3">تغيير اسم المستخدم</h4>
                        {usernameMessage.text && <p className={`text-sm mb-3 p-2 rounded-md bg-opacity-50 ${usernameMessageColor}`}>{usernameMessage.text}</p>}
                        <form onSubmit={handleUsernameChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">اسم المستخدم الحالي</label>
                                <input type="text" value={username} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-400 rounded-md sm:text-sm" readOnly disabled />
                            </div>
                            <div>
                                <label htmlFor="newUsername" className="block text-sm font-medium text-slate-300 mb-1">اسم المستخدم الجديد</label>
                                <input type="text" id="newUsername" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required minLength={3} />
                            </div>
                            <div>
                                <label htmlFor="currentPasswordForUsername" className="block text-sm font-medium text-slate-300 mb-1">كلمة المرور الحالية (للتأكيد)</label>
                                <input type="password" id="currentPasswordForUsername" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                            </div>
                            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors duration-200" disabled={username === 'admin'}>
                                {username === 'admin' ? 'لا يمكن تغيير اسم المسؤول' : 'تغيير اسم المستخدم'}
                            </button>
                        </form>
                    </div>

                    {/* Change Password Form */}
                    <div className="bg-slate-900 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-white mb-3">تغيير كلمة المرور</h4>
                        {passwordMessage.text && <p className={`text-sm mb-3 p-2 rounded-md bg-opacity-50 ${passwordMessageColor}`}>{passwordMessage.text}</p>}
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label htmlFor="oldPassword" className="block text-sm font-medium text-slate-300 mb-1">كلمة المرور القديمة</label>
                                <input type="password" id="oldPassword" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                            </div>
                             <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">كلمة المرور الجديدة</label>
                                <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required minLength={6} />
                            </div>
                            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors duration-200">
                                تغيير كلمة المرور
                            </button>
                        </form>
                    </div>

                    {/* Delete Account Section */}
                    <div className="bg-slate-900 p-4 rounded-lg border border-red-800/50">
                        <h4 className="text-lg font-semibold text-red-400 mb-2">حذف الحساب</h4>
                        <p className="text-sm text-slate-400 mb-4">هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بياناتك، بما في ذلك المحادثات الخاصة.</p>
                        {deleteMessage.text && <p className={`text-sm mb-3 p-2 rounded-md bg-opacity-50 ${deleteMessageColor}`}>{deleteMessage.text}</p>}
                        <form onSubmit={handleAccountDelete} className="space-y-4">
                            <div>
                                <label htmlFor="deletePassword" className="block text-sm font-medium text-slate-300 mb-1">كلمة المرور (للتأكيد)</label>
                                <input type="password" id="deletePassword" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" required disabled={username === 'admin'} />
                            </div>
                            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-600 transition-colors duration-200 disabled:bg-red-900/50 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={username === 'admin'}>
                                {username === 'admin' ? 'لا يمكن حذف حساب المسؤول' : 'حذف حسابي نهائيًا'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettingsPanel;