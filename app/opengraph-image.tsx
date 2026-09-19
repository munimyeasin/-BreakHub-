import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Break Hub | Retro Arcade HTML5 Mini-Game Portal';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B0819',
          padding: '40px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Outer Neo-Brutalist Frame */}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#130F26',
            border: '8px solid #FFE600',
            boxShadow: '16px 16px 0px #FF4081',
            padding: '44px 52px',
          }}
        >
          {/* Top Bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFE600',
                color: '#000000',
                padding: '8px 20px',
                border: '4px solid #000000',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                boxShadow: '4px 4px 0px #000000',
              }}
            >
              RETRO ARCADE PORTAL
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#00F0FF',
                  color: '#000000',
                  padding: '8px 16px',
                  border: '3px solid #000000',
                  fontWeight: 900,
                  fontSize: '14px',
                  letterSpacing: '1px',
                }}
              >
                20+ MINI-GAMES
              </div>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#A3E635',
                  color: '#000000',
                  padding: '8px 16px',
                  border: '3px solid #000000',
                  fontWeight: 900,
                  fontSize: '14px',
                  letterSpacing: '1px',
                }}
              >
                GLOBAL LEADERBOARDS
              </div>
            </div>
          </div>

          {/* Main Title Area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              margin: '20px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '20px',
                fontSize: '74px',
                fontWeight: 900,
                textTransform: 'uppercase',
                lineHeight: '1.05',
              }}
            >
              <span style={{ color: '#FFFFFF' }}>BREAK</span>
              <span style={{ color: '#FFE600' }}>HUB</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                fontWeight: 800,
                color: '#00F0FF',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Instant HTML5 Neo-Brutalist Arcade // Zero Installs // Pure Adrenaline
            </div>
          </div>

          {/* Bottom Badges */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '4px solid #2A224D',
              paddingTop: '20px',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
                fontSize: '15px',
                fontWeight: 800,
              }}
            >
              <span style={{ color: '#A3E635' }}>Instant Canvas Play</span>
              <span style={{ color: '#64748B' }}>|</span>
              <span style={{ color: '#FF4081' }}>Mobile Gamepad</span>
              <span style={{ color: '#64748B' }}>|</span>
              <span style={{ color: '#00F0FF' }}>Daily Quests & XP</span>
            </div>

            <div
              style={{
                display: 'flex',
                backgroundColor: '#FF4081',
                color: '#FFFFFF',
                padding: '8px 24px',
                border: '3px solid #000000',
                fontWeight: 900,
                fontSize: '16px',
                letterSpacing: '1px',
                boxShadow: '4px 4px 0px #000000',
              }}
            >
              PLAY FREE NOW &gt;&gt;
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
