'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { initializeUserData } from '@/lib/init-user';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'signup' | 'reset';

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const router = useRouter();
    const supabase = createClient();

    async function handleEmailAuth(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'reset') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback`,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'パスワードリセットメールを送信しました' });
                return;
            }

            if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                // If auto-confirmed (no email verification), initialize user data
                if (data.session) {
                    await initializeUserData(supabase);
                    router.push('/dashboard');
                    router.refresh();
                    return;
                }
                setMessage({ type: 'success', text: '確認メールを送信しました。メールを確認してください。' });
                return;
            }

            // Login
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await initializeUserData(supabase);
            router.push('/dashboard');
            router.refresh();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            setMessage({ type: 'error', text: error.message });
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-emoji"><img src="/icons/icon-192.png" alt="logo" style={{ width: '64px', height: '64px', borderRadius: '12px' }} /></div>
                <h1>最強の家計簿</h1>
                <p className="login-subtitle">
                    {mode === 'login' && 'アカウントにログイン'}
                    {mode === 'signup' && '新しいアカウントを作成'}
                    {mode === 'reset' && 'パスワードをリセット'}
                </p>

                {message && (
                    <div className={`form-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleEmailAuth}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">メールアドレス</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="mail@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {mode !== 'reset' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="password">パスワード</label>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading
                            ? '処理中...'
                            : mode === 'login'
                                ? 'ログイン'
                                : mode === 'signup'
                                    ? 'アカウント作成'
                                    : 'リセットメール送信'}
                    </button>
                </form>

                <div className="login-divider">または</div>

                <button className="btn-google" onClick={handleGoogleLogin} type="button">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                        <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z" />
                        <path fill="#FBBC05" d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                        <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.48 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" />
                    </svg>
                    Googleでログイン
                </button>

                <div className="login-links">
                    {mode === 'login' && (
                        <>
                            <button onClick={() => { setMode('signup'); setMessage(null); }}>
                                アカウント作成
                            </button>
                            <button onClick={() => { setMode('reset'); setMessage(null); }}>
                                パスワードを忘れた
                            </button>
                        </>
                    )}
                    {(mode === 'signup' || mode === 'reset') && (
                        <button onClick={() => { setMode('login'); setMessage(null); }}>
                            ← ログインに戻る
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
