import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

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
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 120"
          fill="none"
          stroke="#10B981" // emerald-500
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '100%', height: '100%' }}
        >
          <path d="M30,85 C10,85 10,45 35,35 C55,27 65,40 80,45 C95,50 105,55 110,58" />
          <path d="M98,48 L110,58 L98,66" />
          <path d="M30,85 C45,85 55,55 75,60" />
          <circle cx="75" cy="60" r="4" fill="#10B981" stroke="none" />
          <circle cx="82" cy="42" r="4" fill="#10B981" stroke="none" />
          <path d="M60,56 L65,95 L75,95" />
          <path d="M45,67 L45,95 L55,95" />
        </svg>
      </div>
    ),
    { ...size }
  )
}