import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { MAX_IMAGE_SIZE_MB } from '@/lib/constants';
import { createServerClient } from '@/lib/db';
import { detectImageType, validateImageFile } from '@/lib/upload-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizePathSegment(input: string): string {
  const normalized = input.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return normalized || 'wallet';
}

function mimeTypeMatchesDetected(providedMimeType: string, detectedMimeType: string): boolean {
  if (!providedMimeType) return true;
  if (providedMimeType === detectedMimeType) return true;
  if (providedMimeType === 'image/jpg' && detectedMimeType === 'image/jpeg') return true;
  return false;
}

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  const formData = await request.formData();
  const maybeFile = formData.get('file');
  if (!(maybeFile instanceof File)) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
  }
  if (maybeFile.size <= 0) {
    return NextResponse.json({ error: 'Uploaded image is empty' }, { status: 400 });
  }

  const maxSizeBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (maybeFile.size > maxSizeBytes) {
    return NextResponse.json(
      { error: `Image exceeds ${MAX_IMAGE_SIZE_MB}MB limit` },
      { status: 413 }
    );
  }

  const imageBuffer = Buffer.from(await maybeFile.arrayBuffer());
  const validation = validateImageFile(maybeFile.name, maybeFile.size, imageBuffer, maybeFile.type);
  if (!validation.safe) {
    return NextResponse.json(
      { error: validation.reason || 'Uploaded image failed security validation' },
      { status: 400 }
    );
  }

  const detected = detectImageType(imageBuffer);
  if (!detected) {
    return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
  }

  if (!mimeTypeMatchesDetected(maybeFile.type, detected.mimeType)) {
    return NextResponse.json({ error: 'Image MIME type mismatch' }, { status: 400 });
  }

  const supabase = createServerClient();

  // M-04: per-wallet upload quota. 25 uploads / 50 MB per 24 h.
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent, error: quotaErr } = await supabase
    .from('uploads')
    .select('size_bytes')
    .eq('wallet_address', session.walletAddress)
    .gte('created_at', windowStart);
  if (quotaErr) {
    console.error('Upload quota lookup failed:', quotaErr.message);
    return NextResponse.json({ error: 'Unable to check upload quota' }, { status: 500 });
  }
  const uploadsInWindow = recent?.length || 0;
  const bytesInWindow =
    recent?.reduce((s, r) => s + (r.size_bytes as number | null ?? 0), 0) || 0;
  const MAX_UPLOADS_PER_DAY = 25;
  const MAX_BYTES_PER_DAY = 50 * 1024 * 1024;
  if (uploadsInWindow >= MAX_UPLOADS_PER_DAY) {
    return NextResponse.json(
      { error: 'Daily upload count limit reached' },
      { status: 429 }
    );
  }
  if (bytesInWindow + maybeFile.size > MAX_BYTES_PER_DAY) {
    return NextResponse.json(
      { error: 'Daily upload size limit reached' },
      { status: 429 }
    );
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'submission-images';
  const walletSegment = sanitizePathSegment(session.walletAddress);
  const imagePath = `uploads/${walletSegment}/${Date.now()}-${randomUUID()}.${detected.extension}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(imagePath, imageBuffer, {
    contentType: detected.mimeType,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    console.error('Upload failed:', uploadError.message);
    return NextResponse.json({ error: 'Unable to store uploaded image' }, { status: 500 });
  }

  const sha256 = createHash('sha256').update(imageBuffer).digest('hex');
  const { error: trackErr } = await supabase.from('uploads').insert({
    wallet_address: session.walletAddress,
    image_path: imagePath,
    mime_type: detected.mimeType,
    size_bytes: maybeFile.size,
    sha256,
    bucket,
    status: 'ready',
  });
  if (trackErr) {
    // If we can't persist ownership the submission route would also reject.
    // Remove the storage object and return 500 so the client retries later.
    await supabase.storage.from(bucket).remove([imagePath]).catch(() => undefined);
    console.error('Upload tracking insert failed:', trackErr.message);
    return NextResponse.json({ error: 'Unable to track upload' }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(imagePath);

  return NextResponse.json({
    image_path: imagePath,
    public_url: publicUrl || null,
    mime_type: detected.mimeType,
    size: maybeFile.size,
  });
}
