import React, { useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';

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

export default UserManagementPanel;
