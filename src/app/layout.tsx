import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: '家計簿 - Kakeibo',
    description: 'シンプルで使いやすい家計簿アプリ',
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: '#0a0a0f',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <head>
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="家計簿" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
                <link rel="icon" type="image/png" href="/icons/icon-192.png" />
            </head>
            <body>
                {children}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', () => {
                                    navigator.serviceWorker.register('/sw.js');
                                });
                            }
                        `,
                    }}
                />
            </body>
        </html>
    );
}
