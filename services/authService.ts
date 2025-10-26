const USERS_KEY = 'chat-app-users';

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

export const registerUser = (username: string, password: string): { success: boolean, message: string } => {
    if (!username || !password) {
        return { success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان.' };
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
    users[trimmedUsername] = { password };
    setStoredUsers(users);
    return { success: true, message: `تم إنشاء المستخدم ${trimmedUsername} بنجاح.` };
};

export const getUsers = (): string[] => {
    const users = getStoredUsers();
    return Object.keys(users);
};
