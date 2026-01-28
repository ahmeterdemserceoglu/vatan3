'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Lock, CheckCircle, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

function ResetPasswordContent() {
    const { language } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [invalidCode, setInvalidCode] = useState(false);

    // URL'den oobCode'u al (Firebase'in gönderdiği sıfırlama kodu)
    const oobCode = searchParams.get('oobCode');

    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setInvalidCode(true);
                setVerifying(false);
                return;
            }

            try {
                // Kodu doğrula ve e-posta adresini al
                const userEmail = await verifyPasswordResetCode(auth, oobCode);
                setEmail(userEmail);
                setVerifying(false);
            } catch (err) {
                console.error('Code verification error:', err);
                setInvalidCode(true);
                setVerifying(false);
            }
        };

        verifyCode();
    }, [oobCode]);

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return language === 'tr'
                ? 'Şifre en az 8 karakter olmalıdır.'
                : 'Password must be at least 8 characters.';
        }
        if (!/[A-Z]/.test(password)) {
            return language === 'tr'
                ? 'Şifre en az bir büyük harf içermelidir.'
                : 'Password must contain at least one uppercase letter.';
        }
        if (!/[a-z]/.test(password)) {
            return language === 'tr'
                ? 'Şifre en az bir küçük harf içermelidir.'
                : 'Password must contain at least one lowercase letter.';
        }
        if (!/[0-9]/.test(password)) {
            return language === 'tr'
                ? 'Şifre en az bir rakam içermelidir.'
                : 'Password must contain at least one number.';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Şifre doğrulama
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        // Şifre eşleşme kontrolü
        if (newPassword !== confirmPassword) {
            setError(language === 'tr'
                ? 'Şifreler eşleşmiyor.'
                : 'Passwords do not match.');
            return;
        }

        if (!oobCode) {
            setError(language === 'tr'
                ? 'Geçersiz sıfırlama kodu.'
                : 'Invalid reset code.');
            return;
        }

        setLoading(true);

        try {
            // Firebase ile şifreyi sıfırla
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);

            // 3 saniye sonra login sayfasına yönlendir
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch (err: unknown) {
            console.error('Password reset error:', err);
            const errorCode = (err as { code?: string })?.code;

            if (errorCode === 'auth/expired-action-code') {
                setError(language === 'tr'
                    ? 'Sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.'
                    : 'Reset link has expired. Please request a new one.');
            } else if (errorCode === 'auth/invalid-action-code') {
                setError(language === 'tr'
                    ? 'Geçersiz sıfırlama bağlantısı. Lütfen yeni bir bağlantı isteyin.'
                    : 'Invalid reset link. Please request a new one.');
            } else if (errorCode === 'auth/weak-password') {
                setError(language === 'tr'
                    ? 'Şifre çok zayıf. Daha güçlü bir şifre seçin.'
                    : 'Password is too weak. Choose a stronger password.');
            } else {
                setError(language === 'tr'
                    ? 'Şifre sıfırlanamadı. Lütfen tekrar deneyin.'
                    : 'Failed to reset password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-matte-lg border border-stone-200 w-full max-w-md text-center">
                    <Loader2 className="w-12 h-12 text-stone-400 animate-spin mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-stone-800 mb-2">
                        {language === 'tr' ? 'Bağlantı Doğrulanıyor...' : 'Verifying Link...'}
                    </h1>
                    <p className="text-stone-500">
                        {language === 'tr'
                            ? 'Lütfen bekleyin, sıfırlama bağlantınız doğrulanıyor.'
                            : 'Please wait while we verify your reset link.'}
                    </p>
                </div>
            </div>
        );
    }

    // Invalid code state
    if (invalidCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-matte-lg border border-stone-200 w-full max-w-md">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm mb-6 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        {language === 'tr' ? 'Giriş Sayfasına Dön' : 'Back to Login'}
                    </Link>

                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-stone-800 mb-2">
                            {language === 'tr' ? 'Geçersiz veya Süresi Dolmuş Bağlantı' : 'Invalid or Expired Link'}
                        </h1>
                        <p className="text-stone-500 mb-6">
                            {language === 'tr'
                                ? 'Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.'
                                : 'This password reset link is invalid or has expired. Please request a new one.'}
                        </p>
                        <Link
                            href="/auth/forgot-password"
                            className="inline-block w-full py-3 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 transition-colors text-center"
                        >
                            {language === 'tr' ? 'Yeni Bağlantı İste' : 'Request New Link'}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-matte-lg border border-stone-200 w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-800 mb-2">
                        {language === 'tr' ? 'Şifre Başarıyla Değiştirildi!' : 'Password Changed Successfully!'}
                    </h1>
                    <p className="text-stone-500 mb-6">
                        {language === 'tr'
                            ? 'Yeni şifreniz kaydedildi. Şimdi giriş yapabilirsiniz.'
                            : 'Your new password has been saved. You can now sign in.'}
                    </p>
                    <p className="text-stone-400 text-sm mb-4">
                        {language === 'tr'
                            ? 'Giriş sayfasına yönlendiriliyorsunuz...'
                            : 'Redirecting to login page...'}
                    </p>
                    <Link
                        href="/auth/login"
                        className="inline-block w-full py-3 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 transition-colors"
                    >
                        {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-matte-lg border border-stone-200 w-full max-w-md">
                {/* Back Link */}
                <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    {language === 'tr' ? 'Giriş Sayfasına Dön' : 'Back to Login'}
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-stone-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-800">
                        {language === 'tr' ? 'Yeni Şifre Belirle' : 'Set New Password'}
                    </h1>
                    <p className="text-stone-500 mt-1">
                        {email && (
                            <span className="block text-sm text-stone-400 mb-1">{email}</span>
                        )}
                        {language === 'tr'
                            ? 'Hesabınız için yeni bir şifre oluşturun.'
                            : 'Create a new password for your account.'}
                    </p>
                </div>

                {/* Password Requirements */}
                <div className="bg-stone-50 p-4 rounded-xl mb-6 text-sm text-stone-600">
                    <p className="font-medium mb-2">
                        {language === 'tr' ? 'Şifre gereksinimleri:' : 'Password requirements:'}
                    </p>
                    <ul className="space-y-1 text-stone-500">
                        <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-stone-300'}`} />
                            {language === 'tr' ? 'En az 8 karakter' : 'At least 8 characters'}
                        </li>
                        <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-stone-300'}`} />
                            {language === 'tr' ? 'En az bir büyük harf' : 'At least one uppercase letter'}
                        </li>
                        <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-stone-300'}`} />
                            {language === 'tr' ? 'En az bir küçük harf' : 'At least one lowercase letter'}
                        </li>
                        <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-green-600' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-stone-300'}`} />
                            {language === 'tr' ? 'En az bir rakam' : 'At least one number'}
                        </li>
                    </ul>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-2">
                            {language === 'tr' ? 'Yeni Şifre' : 'New Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 pr-12 border border-stone-200 rounded-lg text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-2">
                            {language === 'tr' ? 'Şifre Onayı' : 'Confirm Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-2.5 pr-12 border rounded-lg text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition-all ${confirmPassword && newPassword !== confirmPassword
                                        ? 'border-red-300 bg-red-50'
                                        : confirmPassword && newPassword === confirmPassword
                                            ? 'border-green-300 bg-green-50'
                                            : 'border-stone-200'
                                    }`}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-red-500 text-sm mt-1">
                                {language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match'}
                            </p>
                        )}
                        {confirmPassword && newPassword === confirmPassword && (
                            <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                <CheckCircle size={14} />
                                {language === 'tr' ? 'Şifreler eşleşiyor' : 'Passwords match'}
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !newPassword || !confirmPassword}
                        className="w-full py-3 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {language === 'tr' ? 'Şifre Değiştiriliyor...' : 'Changing Password...'}
                            </>
                        ) : (
                            language === 'tr' ? 'Şifreyi Değiştir' : 'Change Password'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-matte-lg border border-stone-200 w-full max-w-md text-center">
                    <Loader2 className="w-12 h-12 text-stone-400 animate-spin mx-auto mb-4" />
                    <p className="text-stone-500">Yükleniyor...</p>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
