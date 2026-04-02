import { describe, it, expect } from 'vitest';
import {
  detectImageType,
  scanUploadedImage,
  validateImageFile,
} from './upload-security';

// ─── Magic Byte Detection ───────────────────────────────────────

describe('detectImageType', () => {
  it('detects PNG', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(100).fill(0)]);
    const result = detectImageType(png);
    expect(result).not.toBeNull();
    expect(result!.extension).toBe('png');
    expect(result!.mimeType).toBe('image/png');
  });

  it('detects JPEG', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0)]);
    const result = detectImageType(jpeg);
    expect(result).not.toBeNull();
    expect(result!.extension).toBe('jpg');
    expect(result!.mimeType).toBe('image/jpeg');
  });

  it('detects GIF87a', () => {
    const gif = Buffer.from('GIF87a' + '\0'.repeat(100), 'ascii');
    const result = detectImageType(gif);
    expect(result).not.toBeNull();
    expect(result!.extension).toBe('gif');
    expect(result!.mimeType).toBe('image/gif');
  });

  it('detects GIF89a', () => {
    const gif = Buffer.from('GIF89a' + '\0'.repeat(100), 'ascii');
    const result = detectImageType(gif);
    expect(result).not.toBeNull();
    expect(result!.extension).toBe('gif');
    expect(result!.mimeType).toBe('image/gif');
  });

  it('detects WebP', () => {
    const webp = Buffer.alloc(120);
    webp.write('RIFF', 0, 'ascii');
    webp.writeUInt32LE(112, 4);
    webp.write('WEBP', 8, 'ascii');
    const result = detectImageType(webp);
    expect(result).not.toBeNull();
    expect(result!.extension).toBe('webp');
    expect(result!.mimeType).toBe('image/webp');
  });

  it('returns null for unknown format', () => {
    const random = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    expect(detectImageType(random)).toBeNull();
  });

  it('returns null for empty buffer', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for buffer too small', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});

// ─── Executable/Malware Detection ───────────────────────────────

describe('scanUploadedImage', () => {
  it('detects Windows PE executables', () => {
    const pe = Buffer.alloc(200);
    pe[0] = 0x4d; // M
    pe[1] = 0x5a; // Z
    const result = scanUploadedImage(pe);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Executable');
  });

  it('detects ELF binaries', () => {
    const elf = Buffer.alloc(200);
    elf[0] = 0x7f;
    elf[1] = 0x45; // E
    elf[2] = 0x4c; // L
    elf[3] = 0x46; // F
    const result = scanUploadedImage(elf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Executable');
  });

  it('detects ZIP archives', () => {
    const zip = Buffer.alloc(200);
    zip[0] = 0x50; // P
    zip[1] = 0x4b; // K
    zip[2] = 0x03;
    zip[3] = 0x04;
    const result = scanUploadedImage(zip);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Executable');
  });

  it('detects <script> tags in head region', () => {
    const buf = Buffer.alloc(200);
    buf.write('<script>alert(1)</script>', 0, 'utf8');
    const result = scanUploadedImage(buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('<script');
  });

  it('detects javascript: in metadata', () => {
    const buf = Buffer.alloc(200);
    buf.write('javascript:void(0)', 0, 'utf8');
    const result = scanUploadedImage(buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('javascript:');
  });

  it('detects eval( in metadata', () => {
    const buf = Buffer.alloc(200);
    buf.write('eval(something)', 0, 'utf8');
    const result = scanUploadedImage(buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('eval(');
  });

  it('marks clean buffer as safe', () => {
    // Construct a valid-looking PNG that's just zeros after the header
    const png = Buffer.alloc(200);
    png[0] = 0x89;
    png[1] = 0x50;
    png[2] = 0x4e;
    png[3] = 0x47;
    png[4] = 0x0d;
    png[5] = 0x0a;
    png[6] = 0x1a;
    png[7] = 0x0a;
    const result = scanUploadedImage(png);
    expect(result.safe).toBe(true);
  });
});

// ─── Full File Validation ───────────────────────────────────────

describe('validateImageFile', () => {
  function makePngBuffer(size: number = 200): Buffer {
    const buf = Buffer.alloc(size);
    buf[0] = 0x89;
    buf[1] = 0x50;
    buf[2] = 0x4e;
    buf[3] = 0x47;
    buf[4] = 0x0d;
    buf[5] = 0x0a;
    buf[6] = 0x1a;
    buf[7] = 0x0a;
    return buf;
  }

  function makeJpegBuffer(size: number = 200): Buffer {
    const buf = Buffer.alloc(size);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    return buf;
  }

  it('accepts a valid PNG file', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('photo.png', buf.length, buf, 'image/png');
    expect(result.safe).toBe(true);
  });

  it('accepts a valid JPEG file', () => {
    const buf = makeJpegBuffer();
    const result = validateImageFile('photo.jpg', buf.length, buf, 'image/jpeg');
    expect(result.safe).toBe(true);
  });

  it('rejects files exceeding size limit', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('big.png', 6 * 1024 * 1024, buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('5MB');
  });

  it('rejects files that are too small', () => {
    const buf = Buffer.alloc(50);
    const result = validateImageFile('tiny.png', 50, buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('too small');
  });

  it('rejects SVG files', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('vector.svg', buf.length, buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('SVG');
  });

  it('rejects SVGZ files', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('vector.svgz', buf.length, buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('SVG');
  });

  it('rejects suspicious double extensions', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('payload.php.png', buf.length, buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('double');
  });

  it('rejects disallowed file extensions', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('file.bmp', buf.length, buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('extension');
  });

  it('rejects when magic bytes do not match extension', () => {
    // JPEG bytes but .png extension
    const buf = makeJpegBuffer();
    const result = validateImageFile('photo.png', buf.length, buf);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  it('rejects when Content-Type does not match magic bytes', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('photo.png', buf.length, buf, 'image/jpeg');
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Content-Type');
  });

  it('accepts when no Content-Type is provided', () => {
    const buf = makePngBuffer();
    const result = validateImageFile('photo.png', buf.length, buf);
    expect(result.safe).toBe(true);
  });

  it('accepts .jpeg extension for JPEG files', () => {
    const buf = makeJpegBuffer();
    const result = validateImageFile('photo.jpeg', buf.length, buf, 'image/jpeg');
    expect(result.safe).toBe(true);
  });
});
