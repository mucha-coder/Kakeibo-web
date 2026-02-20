'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ArrowLeftRight,
    CalendarDays,
    PiggyBank,
    Settings,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
    { href: '/transactions', label: '収支', icon: ArrowLeftRight },
    { href: '/calendar', label: 'カレンダー', icon: CalendarDays },
    { href: '/budgets', label: '予算', icon: PiggyBank },
    { href: '/settings', label: '設定', icon: Settings },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`bottom-nav-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <item.icon className="nav-icon" />
                        {item.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
