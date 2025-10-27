import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';

const REMEMBERED_USER_KEY = 'rememberedUser';

interface LoginScreenProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const rememberedUser = localStorage.getItem(REMEMBERED_USER_KEY);
    if (rememberedUser) {
      setUsername(rememberedUser);
      setRememberMe(true);
    }
  }, []);

  const clearFormState = () => {
    setError('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
    setReferralCode('');
    setLoading(false);
  };

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    clearFormState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (isRegistering) {
        if (password !== confirmPassword) {
            setError('كلمتا المرور غير متطابقتين.');
            setLoading(false);
            return;
        }
        
        const result = authService.registerUser(username, password, referralCode);
        setLoading(false);

        if (result.success) {
            setSuccessMessage(result.message + ' يمكنك الآن تسجيل الدخول.');
            setIsRegistering(false); // Switch back to login
            setPassword('');
            setConfirmPassword('');
            setReferralCode('');
        } else {
            setError(result.message);
        }
    } else { // Login logic
        const success = await onLogin(username, password, rememberMe);
        if (!success) {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
            setLoading(false);
        }
        // On success, the component will unmount, so no need to set loading to false.
    }
  };

  const formContent = isRegistering ? {
      title: 'إنشاء حساب جديد',
      subtitle: 'أدخل بياناتك ورمز الإحالة للانضمام',
      buttonText: 'إنشاء حساب',
      loadingText: 'جاري الإنشاء...',
      toggleLinkText: 'لديك حساب بالفعل؟ تسجيل الدخول'
  } : {
      title: 'تسجيل الدخول إلى الدردشة',
      subtitle: 'أدخل بياناتك للدردشة مع أصدقائك',
      buttonText: 'تسجيل الدخول',
      loadingText: 'جاري الدخول...',
      toggleLinkText: 'ليس لديك حساب؟ إنشاء حساب جديد'
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-8 bg-slate-800 rounded-2xl shadow-2xl m-4">
        <div className="text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-500 to-pink-500 pb-2">الحادي عشر عينابوس</h2>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">{formContent.title}</h1>
          <p className="mt-3 text-slate-400">{formContent.subtitle}</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && <div className="p-3 text-xs sm:text-sm text-red-200 bg-red-800 bg-opacity-50 border border-red-700 rounded-md text-center">{error}</div>}
          {successMessage && <div className="p-3 text-xs sm:text-sm text-green-200 bg-green-800 bg-opacity-50 border border-green-700 rounded-md text-center">{successMessage}</div>}
          <div>
            <label htmlFor="username" className="sr-only">اسم المستخدم</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="appearance-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-50"
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          {isRegistering && (
            <div>
                <label htmlFor="referralCode" className="sr-only">رمز الإحالة</label>
                <input
                id="referralCode"
                name="referralCode"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-50"
                placeholder="رمز الإحالة"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                disabled={loading}
                />
            </div>
          )}
          <div>
            <label htmlFor="password" className="sr-only">كلمة المرور</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              required
              className="appearance-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-50"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {isRegistering && (
            <div>
                <label htmlFor="confirm-password" className="sr-only">تأكيد كلمة المرور</label>
                <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-50"
                placeholder="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                />
            </div>
          )}
          {!isRegistering && (
            <div className="flex items-center">
                <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                />
                <label htmlFor="remember-me" className="mr-2 block text-sm text-slate-300 select-none cursor-pointer">
                تذكرني
                </label>
            </div>
          )}
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-all duration-200 transform active:scale-95 active:brightness-90 disabled:bg-indigo-500 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {formContent.loadingText}
                </>
              ) : (
                formContent.buttonText
              )}
            </button>
          </div>
           <div className="text-center">
            <button type="button" onClick={handleToggleMode} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none" disabled={loading}>
                {formContent.toggleLinkText}
            </button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-slate-700">
          <p className="text-sm text-slate-400 mb-4">تابعنا على</p>
          <div className="flex items-center justify-center gap-6">
            <a href="https://vm.tiktok.com/ZSHvGoK61aftp-ySWF5/" target="_blank" rel="noopener noreferrer" title="TikTok" className="text-slate-400 hover:text-white transition-colors duration-200">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.03-4.83-1-6.7-2.91-1.85-1.88-2.75-4.61-2.2-7.18.51-2.45 2.42-4.59 4.79-5.51 2.03-.8 4.34.1 5.51 2.32.06.11.11.22.17.33.01-1.02.02-2.03.01-3.05-.02-1.39-.58-2.73-1.48-3.69-1.01-1.07-2.52-1.63-4-1.66-1.79-.04-3.57.48-4.83 1.81V.02h4.17c.1-.01.21-.01.31-.01Z"/>
              </svg>
            </a>
            <a href="https://youtube.com/@watanhake?si=lTdsVV9iwL-HTWkT" target="_blank" rel="noopener noreferrer" title="YouTube" className="text-slate-400 hover:text-red-500 transition-colors duration-200">
               <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"/>
              </svg>
            </a>
            <a href="https://m.me/ahmd.jhad.swfan?source=qr_link_share" target="_blank" rel="noopener noreferrer" title="Messenger" className="text-slate-400 hover:text-blue-500 transition-colors duration-200">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.422 1.657 6.463 4.2 8.444v4.445l3.844-2.135c1.239.356 2.568.545 3.956.545 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0Zm1.233 14.933-2.466-2.8-5.7 2.8L12.001 7.1l2.466 2.8 5.7-2.8L13.233 14.933Z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
