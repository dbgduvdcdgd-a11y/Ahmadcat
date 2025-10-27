import React, { useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';

interface UserManagementPanelProps {
    onClose: () => void;
    onUserDeleted: (username: string) => void;
}

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ onClose, onUserDeleted }) => {
    const [users, setUsers] = useState<Array<{ username: string; password: string }>>([]);
    const [referralCodes, setReferralCodes] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    const loadData = useCallback(() => {
        setUsers(authService.getUsersWithPasswords());
        setReferralCodes(authService.getReferralCodes());
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleGenerateCode = () => {
        setMessage('');
        const result = authService.generateReferralCode();
        setMessage(result.message);
        setMessageType(result.success ? 'success' : 'error');

        if (result.success) {
            loadData(); // Refresh both users and codes
            navigator.clipboard.writeText(result.code!);
        }
    };
    
    const handleDeleteUser = (username: string) => {
        if (window.confirm(`هل أنت متأكد أنك تريد حذف المستخدم ${username}؟ لا يمكن التراجع عن هذا الإجراء.`)) {
            const result = authService.deleteUser(username);

            setMessage(result.message);
            setMessageType(result.success ? 'success' : 'error');

            if (result.success) {
                profileService.deleteUserProfile(username);
                loadData();
                onUserDeleted(username);
            }
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
                        <h4 className="text-lg font-semibold text-white mb-3">توليد رمز إحالة</h4>
                        {message && <p className={`text-sm mb-3 p-2 rounded-md bg-opacity-50 ${messageColor}`}>{message}</p>}
                         <button onClick={handleGenerateCode} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors duration-200">
                            إنشاء رمز جديد ونسخه
                        </button>
                    </div>

                    <div className="mt-6">
                        <h4 className="text-lg font-semibold text-white mb-3">الرموز النشطة ({referralCodes.length})</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                           {referralCodes.length > 0 ? referralCodes.map(code => (
                                <div key={code} className="bg-slate-700 p-2 rounded-md text-sm flex justify-between items-center gap-2">
                                    <span className="font-mono text-indigo-300 tracking-widest">{code}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(code);
                                            setMessage(`تم نسخ الرمز ${code}`);
                                            setMessageType('success');
                                            setTimeout(() => setMessage(''), 2000);
                                        }}
                                        title="نسخ الرمز"
                                        className="p-1 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            )) : <p className="text-sm text-slate-400">لا توجد رموز نشطة. قم بتوليد رمز جديد.</p>}
                        </div>
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
                                        {username !== 'admin' && (
                                            <button
                                                onClick={() => handleDeleteUser(username)}
                                                title="حذف المستخدم"
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                aria-label={`حذف ${username}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
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
