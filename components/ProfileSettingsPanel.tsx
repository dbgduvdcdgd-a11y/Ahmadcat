import React, { useState } from 'react';
import * as authService from '../services/authService';

interface ProfileSettingsPanelProps {
    username: string;
    onClose: () => void;
    onUsernameChangeSuccess: (newUsername: string) => void;
}

const ProfileSettingsPanel: React.FC<ProfileSettingsPanelProps> = ({ username, onClose, onUsernameChangeSuccess }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [usernameMessage, setUsernameMessage] = useState({ text: '', type: 'success' });

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: 'success' });

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
    
    const usernameMessageColor = usernameMessage.type === 'success' ? 'text-green-300 bg-green-900' : 'text-red-300 bg-red-900';
    const passwordMessageColor = passwordMessage.type === 'success' ? 'text-green-300 bg-green-900' : 'text-red-300 bg-red-900';

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
                </div>
            </div>
        </div>
    );
};

export default ProfileSettingsPanel;
