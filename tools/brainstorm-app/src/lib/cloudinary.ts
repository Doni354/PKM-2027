const CLOUD_NAME = (
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
).trim();

const UPLOAD_PRESET = (
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''
).trim();

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export interface CloudinaryUploadResult {
  url: string;
  width: number;
  height: number;
  publicId: string;
}

/**
 * Inserts automatic modern format & quality transforms (`f_auto,q_auto`) into a
 * Cloudinary delivery URL while preserving the original URL for full-size viewing.
 */
export function getOptimizedCloudinaryUrl(
  rawUrl: string,
  maxWidth = 1000
): string {
  if (!rawUrl || !rawUrl.includes('res.cloudinary.com') || !rawUrl.includes('/image/upload/')) {
    return rawUrl;
  }
  if (rawUrl.includes('/image/upload/f_auto')) {
    return rawUrl;
  }
  return rawUrl.replace(
    '/image/upload/',
    `/image/upload/f_auto,q_auto,w_${maxWidth},c_limit/`
  );
}

/**
 * Uploads a pasted or dropped image directly to Cloudinary using a scoped unsigned preset
 * (no API secret is ever exposed in browser bundles). Uses AbortSignal.timeout for deadlines.
 */
export async function uploadImageToCloudinary(
  file: Blob,
  roomId: string
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured) {
    throw new Error(
      'Konfigurasi Cloudinary (.env) belum diatur. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Hanya file gambar (PNG, JPG, WebP, GIF) yang didukung.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Ukuran gambar melebihi batas 10 MB.');
  }

  const formData = new FormData();
  const fileName =
    file instanceof File && file.name
      ? file.name
      : `paste-${Date.now()}.${(file.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '')}`;

  formData.append('file', file, fileName);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `idea-studio/${roomId || 'default'}`);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/image/upload`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('Unggah gambar timeout (lebih dari 25 detik). Coba lagi.', {
        cause: err,
      });
    }
    throw new Error('Gagal terhubung ke Cloudinary. Periksa koneksi internet Anda.', {
      cause: err,
    });
  }

  let data: {
    secure_url?: string;
    width?: number;
    height?: number;
    public_id?: string;
    error?: { message?: string };
  };

  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Respons Cloudinary tidak valid (HTTP ${response.status}).`, {
      cause: err,
    });
  }

  if (!response.ok || !data.secure_url) {
    throw new Error(
      data.error?.message || `Unggah gambar gagal (HTTP ${response.status}).`
    );
  }

  return {
    url: data.secure_url,
    width: data.width ?? 640,
    height: data.height ?? 420,
    publicId: data.public_id ?? '',
  };
}

