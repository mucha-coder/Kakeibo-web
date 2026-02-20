import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#6366f1',
                    borderRadius: '32px',
                    fontSize: '120px',
                    color: 'white',
                    fontWeight: 700,
                    fontFamily: 'sans-serif',
                }}
            >
                ¥
            </div>
        ),
        { ...size }
    );
}
