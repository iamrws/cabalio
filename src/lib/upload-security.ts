import { MAX_IMAGE_SIZE_MB } from './constants';

export interface DetectedImageType {
  extension: 'png' | 'jpg' | 'gif' | 'webp';
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
}

export interface ScanResult {
  safe: boolean;
  reason?: string;
}

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isGif(buffer: Buffer): boolean {
  if (buffer.length < 6) return false;
  const header = buffer.subarray(0, 6).toString('ascii');
  return header === 'GIF87a' || header === 'GIF89a';
}

function isWebp(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  return riff === 'RIFF' && webp === 'WEBP';
}

export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (isPng(buffer)) return { extension: 'png', mimeType: 'image/png' };
  if (isJpeg(buffer)) return { extension: 'jpg', mimeType: 'image/jpeg' };
  if (isGif(buffer)) return { extension: 'gif', mimeType: 'image/gif' };
  if (isWebp(buffer)) return { extension: 'webp', mimeType: 'image/webp' };
  return null;
}

function hasSuspiciousExecutableMarkers(buffer: Buffer): boolean {
  if (buffer.length < 2) return false;

  // Windows PE
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) return true;
  // ELF
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return true;
  // Zip archive disguised as image
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return true;

  return false;
}

export function scanUploadedImage(buffer: Buffer): ScanResult {
  if (hasSuspiciousExecutableMarkers(buffer)) {
    return { safe: false, reason: 'Executable/archive signature detected' };
  }

  const decoded = buffer.toString('utf8').toLowerCase();
  const suspiciousSnippets = [
    '<script',
    'javascript:',
    'onerror=',
    'onload=',
    'cmd.exe',
    'powershell',
    'wget ',
    'curl ',
    'eval(',
    '<iframe',
  ];

  for (const snippet of suspiciousSnippets) {
    if (decoded.includes(snippet)) {
      return { safe: false, reason: `Suspicious payload marker detected (${snippet})` };
    }
  }

  return { safe: true };
}

/** Minimum file size to reject trivially empty or corrupt uploads. */
const MIN_IMAGE_SIZE_BYTES = 100;

/** Mapping from detected magic-byte type to expected file extensions. */
const EXTENSION_MAP: Record<string, string[]> = {
  png: ['.png'],
  jpg: ['.jpg', '.jpeg'],
  gif: ['.gif'],
  webp: ['.webp'],
};

/** Mapping from detected magic-byte type to allowed Content-Type values. */
const CONTENT_TYPE_MAP: Record<string, string[]> = {
  png: ['image/png'],
  jpg: ['image/jpeg', 'image/jpg'],
  gif: ['image/gif'],
  webp: ['image/webp'],
};

export function validateImageFile(
  fileName: string,
  fileSizeBytes: number,
  buffer: Buffer,
  contentType?: string
): ScanResult {
  // Size limit checks
  const maxSizeBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (fileSizeBytes > maxSizeBytes) {
    return { safe: false, reason: `Image exceeds ${MAX_IMAGE_SIZE_MB}MB limit` };
  }
  if (fileSizeBytes < MIN_IMAGE_SIZE_BYTES) {
    return { safe: false, reason: 'Image file is too small to be valid' };
  }

  const lowerName = fileName.toLowerCase();

  // Block SVG explicitly
  if (lowerName.endsWith('.svg') || lowerName.endsWith('.svgz')) {
    return { safe: false, reason: 'SVG uploads are not allowed' };
  }

  // Block double extensions (e.g. image.php.jpg is suspicious)
  const parts = lowerName.split('.');
  if (parts.length > 2) {
    const suspiciousExtensions = ['.php', '.js', '.html', '.htm', '.exe', '.sh', '.bat', '.cmd', '.ps1'];
    for (const part of parts.slice(1, -1)) {
      if (suspiciousExtensions.includes(`.${part}`)) {
        return { safe: false, reason: 'Suspicious double file extension detected' };
      }
    }
  }

  // Extension allowlist check
  const extensionAllowed =
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.webp');

  if (!extensionAllowed) {
    return { safe: false, reason: 'File extension not allowed' };
  }

  // Magic-byte detection
  const detected = detectImageType(buffer);
  if (!detected) {
    return { safe: false, reason: 'Unsupported or invalid image format' };
  }

  // Cross-validate: file extension must match magic-byte detected type
  const allowedExtensions = EXTENSION_MAP[detected.extension] || [];
  const extensionMatchesMagic = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (!extensionMatchesMagic) {
    return { safe: false, reason: 'File extension does not match detected image type' };
  }

  // Cross-validate: Content-Type (if provided) must match magic-byte detected type
  if (contentType) {
    const allowedContentTypes = CONTENT_TYPE_MAP[detected.extension] || [];
    if (!allowedContentTypes.includes(contentType.toLowerCase())) {
      return { safe: false, reason: 'Content-Type does not match detected image type' };
    }
  }

  return scanUploadedImage(buffer);
}
