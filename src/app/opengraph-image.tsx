import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kiwi Commuter'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#070D18', // Matches your dark navy background
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            fill="none"
            stroke="#10B981"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '120px', height: '120px', marginRight: '30px' }}
          >
            <path d="M30,85 C10,85 10,45 35,35 C55,27 65,40 80,45 C95,50 105,55 110,58" />
            <path d="M98,48 L110,58 L98,66" />
            <path d="M30,85 C45,85 55,55 75,60" />
            <circle cx="75" cy="60" r="4" fill="#10B981" stroke="none" />
            <circle cx="82" cy="42" r="4" fill="#10B981" stroke="none" />
            <path d="M60,56 L65,95 L75,95" />
            <path d="M45,67 L45,95 L55,95" />
          </svg>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#FFFFFF' }}>
            Kiwi Commuter
          </div>
        </div>
        <div style={{ marginTop: 30, fontSize: 32, color: '#94A3B8' }}>
          The daily commute calculator for driving and public transport
        </div>
      </div>
    ),
    { ...size }
  )
}