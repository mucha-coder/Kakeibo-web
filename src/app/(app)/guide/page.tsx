'use client';

import { ArrowLeft, Plus, CreditCard, Calendar, Repeat, PiggyBank, BarChart3, Settings, Download, LogIn } from 'lucide-react';
import Link from 'next/link';

const steps = [
    {
        icon: <LogIn size={24} />,
        title: 'ログイン・アカウント作成',
        desc: 'メールアドレスまたはGoogleアカウントで簡単にログインできます。初回ログイン時にデフォルトのカテゴリと支払方法が自動で作成されます。',
    },
    {
        icon: <Plus size={24} />,
        title: '収支を記録する',
        desc: 'ダッシュボードまたは収支一覧ページから「＋追加」ボタンで取引を入力します。カテゴリ・金額・日付・支払方法・メモを入力してください。',
    },
    {
        icon: <CreditCard size={24} />,
        title: '支払方法を管理する',
        desc: '設定 → 支払方法から、クレジットカードや電子マネーなどを追加できます。カードテンプレートを使えば締め日・支払日が自動入力されます。',
    },
    {
        icon: <Calendar size={24} />,
        title: 'カレンダーで確認する',
        desc: 'カレンダーページでは、日別の収支を一目で確認できます。日付をタップすると、その日の取引一覧が表示されます。',
    },
    {
        icon: <Repeat size={24} />,
        title: '固定費を登録する',
        desc: '設定 → 繰り返し・固定費から、毎月発生する家賃や光熱費を登録できます。年間の合計金額も確認できます。',
    },
    {
        icon: <PiggyBank size={24} />,
        title: '予算を設定する',
        desc: '設定 → 予算から、カテゴリ別の月間予算を設定できます。進捗バーで使いすぎを防止しましょう。',
    },
    {
        icon: <BarChart3 size={24} />,
        title: 'レポートを見る',
        desc: 'レポートページでは、月別推移・カテゴリ別・支払方法別の分析グラフを確認できます。支出傾向を把握しましょう。',
    },
    {
        icon: <Download size={24} />,
        title: 'CSVインポート',
        desc: '設定ページからPayPayなどの取引履歴CSVをインポートできます。まとめて記録したい場合に便利です。',
    },
    {
        icon: <Settings size={24} />,
        title: 'ホーム画面に追加 (PWA)',
        desc: 'スマホのブラウザメニューから「ホーム画面に追加」を選択すると、アプリのように使えます。',
    },
];

export default function GuidePage() {
    return (
        <>
            <div className="mobile-header">
                <h1><img src="/icons/icon-192.png" alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', verticalAlign: 'middle', marginRight: '6px' }} />最強の家計簿</h1>
            </div>

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <Link href="/settings" className="btn btn-ghost btn-icon" style={{ textDecoration: 'none' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h2>使い方ガイド</h2>
                        <p>初めての方へ・機能の紹介</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📖</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
                        ようこそ！最強の家計簿へ
                    </h3>
                    <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                        最強の家計簿アプリです。<br />
                        以下のステップに沿って、簡単に家計管理を始めましょう。
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {steps.map((step, i) => (
                    <div key={i} className="card" style={{ padding: '20px' }}>
                        <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
                            <div style={{
                                minWidth: '48px',
                                height: '48px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--accent-primary-glow)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-primary-hover)',
                            }}>
                                {step.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        background: 'var(--gradient-primary)',
                                        color: 'white',
                                        borderRadius: '12px',
                                        padding: '2px 8px',
                                    }}>
                                        STEP {i + 1}
                                    </span>
                                    <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{step.title}</h4>
                                </div>
                                <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card mt-6" style={{ padding: '24px', textAlign: 'center' }}>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                    まずはダッシュボードから収支を記録してみましょう！
                </p>
                <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    ダッシュボードへ
                </Link>
            </div>
        </>
    );
}
