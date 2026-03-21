import { access, readFile } from 'fs/promises';
import { join, extname } from 'path';

import { NextResponse } from 'next/server';

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

function getCandidatePaths(slug: string[]) {
  const rootDir = process.cwd();
  return [
    join(rootDir, 'apps', 'web', 'public', 'uploads', ...slug),
    join(rootDir, 'public', 'uploads', ...slug),
  ];
}

function isSafeSlug(slug: string[]) {
  return slug.length > 0 && slug.every((part) => part && !part.includes('..') && !part.includes('/'));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;

  if (!isSafeSlug(slug)) {
    return new NextResponse('Not found', { status: 404 });
  }

  for (const candidate of getCandidatePaths(slug)) {
    try {
      await access(candidate);
      const file = await readFile(candidate);
      const ext = extname(candidate).toLowerCase();
      return new NextResponse(file, {
        status: 200,
        headers: {
          'Content-Type': contentTypes[ext] ?? 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // try next candidate
    }
  }

  return new NextResponse('Not found', { status: 404 });
}
