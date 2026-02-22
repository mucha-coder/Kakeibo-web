import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

// 認証チェックは middleware.ts で一括実施済み
// layout での二重チェックを廃止し、ページ遷移を高速化
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
