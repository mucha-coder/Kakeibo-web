import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
    width: 180,
    height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 90,
                    background: '#6366f1',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    // Apple icons should be square and opaque; iOS adds rounding
                }}
            >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        width: '110px',
                        height: '80px',
                        background: 'white',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '4px solid white'
                    }}>
                        <div style={{ color: '#6366f1', fontSize: '55px', fontWeight: 'bold', marginTop: '-4px' }}>¥</div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        right: '-8px',
                        top: '18px',
                        width: '16px',
                        height: '44px',
                        background: '#fbbf24',
                        borderRadius: '4px'
                    }} />
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
