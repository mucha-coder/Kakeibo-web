import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
    width: 192,
    height: 192,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 100,
                    background: '#6366f1',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '0px', // Full bleed, let OS handle rounding
                }}
            >
                {/* Wallet-like composition using simple shapes/text since emojis can be inconsistent */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        width: '120px',
                        height: '90px',
                        background: 'white',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '4px solid white'
                    }}>
                        <div style={{ color: '#6366f1', fontSize: '60px', fontWeight: 'bold' }}>¥</div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        right: '-10px',
                        top: '20px',
                        width: '20px',
                        height: '50px',
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
