const USERS_KEY = 'chat-app-users';
const REFERRAL_CODES_KEY = 'chat-app-referral-codes';
const PRIVATE_CHAT_PREFIX = 'private-chat-';

// ملاحظة: هذا التنفيذ غير آمن ومخصص للأغراض التوضيحية فقط.
// في تطبيق حقيقي، لا تقم أبدًا بتخزين كلمات المرور كنص عادي.
const getStoredUsers = (): Record<string, { password: string }> => {
    try {
        const users = localStorage.getItem(USERS_KEY);
        return users ? JSON.parse(users) : {};
    } catch {
        return {};
    }
};

const setStoredUsers = (users: Record<string, { password: string }>) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const getStoredReferralCodes = (): string[] => {
    try {
        const codes = localStorage.getItem(REFERRAL_CODES_KEY);
        return codes ? JSON.parse(codes) : [];
    } catch {
        return [];
    }
};

const setStoredReferralCodes = (codes: string[]) => {
    localStorage.setItem(REFERRAL_CODES_KEY, JSON.stringify(codes));
};


const cleanupUserChats = (deletedUsername: string) => {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(PRIVATE_CHAT_PREFIX)) {
            // e.g., private-chat-userA-userB
            const participantsKey = key.substring(PRIVATE_CHAT_PREFIX.length);
            const participants = participantsKey.split('-');
            if (participants.includes(deletedUsername)) {
                localStorage.removeItem(key);
            }
        }
    });
};

export const initializeAdmin = () => {
    const users = getStoredUsers();
    if (!users.admin) {
        users.admin = { password: 'AdminPassword123!' };
        setStoredUsers(users);
    }
};

export const login = (username: string, password: string): boolean => {
    const users = getStoredUsers();
    const user = users[username];
    return !!user && user.password === password;
};

export const registerUser = (username: string, password: string, referralCode: string): { success: boolean, message: string } => {
    if (!username || !password || !referralCode) {
        return { success: false, message: 'اسم المستخدم وكلمة المرور ورمز الإحالة مطلوبان.' };
    }

    const codes = getStoredReferralCodes();
    if (!codes.includes(referralCode.trim())) {
        return { success: false, message: 'رمز الإحالة غير صالح أو تم استخدامه.' };
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
        return { success: false, message: 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل.' };
    }
    if (password.length < 6) {
        return { success: false, message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' };
    }

    const users = getStoredUsers();
    if (users[trimmedUsername]) {
        return { success: false, message: 'اسم المستخدم موجود بالفعل.' };
    }

    // All checks passed, create user and remove code
    users[trimmedUsername] = { password };
    setStoredUsers(users);

    const updatedCodes = codes.filter(c => c !== referralCode.trim());
    setStoredReferralCodes(updatedCodes);

    return { success: true, message: `تم إنشاء المستخدم ${trimmedUsername} بنجاح.` };
};

// Admin function
export const generateReferralCode = (): { success: boolean; code?: string; message: string } => {
    const codes = getStoredReferralCodes();
    let newCode: string;
    do {
        // Generate a 6-digit code
        newCode = Math.floor(100000 + Math.random() * 900000).toString();
    } while (codes.includes(newCode)); // Ensure uniqueness

    codes.push(newCode);
    setStoredReferralCodes(codes);
    return { success: true, code: newCode, message: `تم إنشاء رمز الإحالة الجديد: ${newCode}` };
};

export const getReferralCodes = (): string[] => {
    return getStoredReferralCodes();
};


export const getUsers = (): string[] => {
    const users = getStoredUsers();
    return Object.keys(users);
};

export const changePassword = (username: string, oldPassword: string, newPassword: string): { success: boolean, message: string } => {
    if (newPassword.length < 6) {
        return { success: false, message: 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.' };
    }
    const users = getStoredUsers();
    const user = users[username];
    if (!user || user.password !== oldPassword) {
        return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
    }
    users[username].password = newPassword;
    setStoredUsers(users);
    return { success: true, message: 'تم تغيير كلمة المرور بنجاح.' };
};

export const changeUsername = (oldUsername: string, newUsername: string, password: string): { success: boolean, message: string } => {
    const trimmedNewUsername = newUsername.trim();
    if (trimmedNewUsername.length < 3) {
        return { success: false, message: 'يجب أن يكون اسم المستخدم الجديد 3 أحرف على الأقل.' };
    }
    if (trimmedNewUsername === 'System') {
        return { success: false, message: 'اسم المستخدم غير صالح.' };
    }
    const users = getStoredUsers();
    const user = users[oldUsername];
    if (!user || user.password !== password) {
        return { success: false, message: 'كلمة المرور غير صحيحة.' };
    }
    if (users[trimmedNewUsername]) {
        return { success: false, message: 'اسم المستخدم الجديد موجود بالفعل.' };
    }
    if (oldUsername === 'admin' && trimmedNewUsername !== 'admin') {
         return { success: false, message: 'لا يمكن تغيير اسم مستخدم المسؤول.' };
    }

    users[trimmedNewUsername] = { password: user.password };
    delete users[oldUsername];
    setStoredUsers(users);
    
    return { success: true, message: 'تم تغيير اسم المستخدم بنجاح.' };
};

// Admin function
export const deleteUser = (username: string): { success: boolean, message: string } => {
    if (username === 'admin') {
        return { success: false, message: 'لا يمكن حذف حساب المسؤول.' };
    }
    const users = getStoredUsers();
    if (!users[username]) {
        return { success: false, message: 'المستخدم غير موجود.' };
    }
    delete users[username];
    setStoredUsers(users);
    cleanupUserChats(username); // Clean up private chats
    return { success: true, message: `تم حذف المستخدم ${username} بنجاح.` };
};

// User self-delete function
export const deleteSelf = (username: string, password: string): { success: boolean, message: string } => {
    if (username === 'admin') {
        return { success: false, message: 'لا يمكن حذف حساب المسؤول.' };
    }
    const users = getStoredUsers();
    const user = users[username];

    if (!user) {
        return { success: false, message: 'المستخدم غير موجود.' };
    }

    if (user.password !== password) {
        return { success: false, message: 'كلمة المرور غير صحيحة.' };
    }

    // Password is correct, proceed with deletion
    delete users[username];
    setStoredUsers(users);
    cleanupUserChats(username); // Clean up private chats
    return { success: true, message: 'تم حذف الحساب بنجاح. جاري تسجيل الخروج...' };
};


export const getUsersWithPasswords = (): Array<{ username: string, password: string }> => {
    const users = getStoredUsers();
    return Object.entries(users).map(([username, data]) => ({
        username,
        password: data.password,
    }));
};
