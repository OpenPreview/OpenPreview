import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@openpreview/db/server';

export const runtime = 'edge';

function generateColors(email: string): string[] {
  // Simple string to number hash function
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate 2 different hues based on the hash
  const baseHue = Math.abs(hash % 360);
  // Second hue is offset by a random-ish amount between 60 and 180 degrees
  const offset = 60 + Math.abs((hash >> 8) % 120);

  return [
    `hsl(${baseHue}, 70%, 60%)`,
    `hsl(${(baseHue + offset) % 360}, 70%, 60%)`,
  ];
}

export async function GET(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const colors = generateColors(user.email);
  const width = 400;
  const height = 400;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}" />
          <stop offset="100%" stop-color="${colors[1]}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)" />
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
