import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/lib/supabase-service';

const STORAGE_BUCKET = 'media';
const allowedFolders = new Set(['avatars', 'home', 'general']);

function sanitizeSegment(value: string, fallback: string) {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || fallback;
}

function buildSafeFilename(value: string) {
  const normalized = value.trim();
  const lastDot = normalized.lastIndexOf('.');
  const hasExtension = lastDot > 0 && lastDot < normalized.length - 1;
  const rawBase = hasExtension ? normalized.slice(0, lastDot) : normalized;
  const rawExt = hasExtension ? normalized.slice(lastDot + 1).toLowerCase() : '';
  const base = sanitizeSegment(rawBase, 'image');
  const ext = rawExt.replace(/[^a-z0-9]/g, '');
  return ext ? `${base}.${ext}` : base;
}

function getLocalUploadDirs(folder: string) {
  const rootDir = process.cwd();
  const appPublic = join(rootDir, 'apps', 'web', 'public', 'uploads', folder);
  const rootPublic = join(rootDir, 'public', 'uploads', folder);

  return appPublic === rootPublic ? [appPublic] : [appPublic, rootPublic];
}

async function uploadToSupabase(file: File, folder: string, filename: string) {
  const supabase = getSupabaseServiceClient();
  const storage = supabase.storage;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { data: buckets, error: listError } = await storage.listBuckets();
  if (listError) {
    throw listError;
  }

  if (!(buckets ?? []).some((bucket) => bucket.name === STORAGE_BUCKET)) {
    const { error: createError } = await storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/*'],
    });
    if (createError && !createError.message.toLowerCase().includes('already exists')) {
      throw createError;
    }
  }

  const objectPath = `${folder}/${filename}`;
  const { error: uploadError } = await storage.from(STORAGE_BUCKET).upload(objectPath, buffer, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function uploadToLocal(file: File, folder: string, filename: string) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDirs = getLocalUploadDirs(folder);

  await Promise.all(
    uploadDirs.map(async (dir) => {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, filename), buffer);
    }),
  );

  return `/uploads/${folder}/${filename}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawFolder = String(formData.get('folder') ?? 'general');
    const folder = allowedFolders.has(rawFolder) ? rawFolder : 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 400 });
    }

    const timestamp = Date.now();
  const filename = `${timestamp}-${buildSafeFilename(file.name)}`;

    let url = '';
    try {
      url = await uploadToSupabase(file, folder, filename);
    } catch {
      url = await uploadToLocal(file, folder, filename);
    }

    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 },
    );
  }
}
