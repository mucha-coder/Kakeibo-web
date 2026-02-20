'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ArrowLeftRight,
    CalendarDays,
    Repeat,
    PiggyBank,
    BarChart3,
    LogOut,
    Settings,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/transactions', label: '収支一覧', icon: ArrowLeftRight },
    { href: '/calendar', label: 'カレンダー', icon: CalendarDays },
    { href: '/recurring', label: '繰り返し', icon: Repeat },
    { href: '/budgets', label: '予算', icon: PiggyBank },
    { href: '/reports', label: 'レポート', icon: BarChart3 },
    { href: '/settings', label: '設定', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span className="logo-icon">💰</span>
                <h1>家計簿</h1>
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <item.icon className="link-icon" />
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">
                <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%' }}>
                    <LogOut className="link-icon" />
                    ログアウト
                </button>
            </div>
        </aside>
    );
}
