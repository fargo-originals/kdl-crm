import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 300,
          fontWeight: 'bold',
          borderRadius: '15%',
        }}
      >
        K
      </div>
    ),
    { width: 512, height: 512 },
  );
}
