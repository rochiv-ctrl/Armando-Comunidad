import { supabase } from '@/lib/supabaseClient';

export const MAX_FOTO_MB = 3;

// Devuelve un mensaje de error, o null si la imagen es válida
export function validarFoto(archivo: File): string | null {
  if (!archivo.type.startsWith('image/')) {
    return 'El archivo tiene que ser una imagen (JPG, PNG, WEBP...).';
  }
  if (archivo.size > MAX_FOTO_MB * 1024 * 1024) {
    return `La foto no puede pesar más de ${MAX_FOTO_MB} MB.`;
  }
  return null;
}

// Sube la foto a Supabase Storage (carpeta propia de cada usuario) y devuelve su URL pública
export async function subirAvatar(archivo: File, userId: string): Promise<string> {
  const extension = (archivo.name.split('.').pop() || 'jpg').toLowerCase();
  const ruta = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(ruta, archivo, { upsert: true, contentType: archivo.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(ruta);
  return data.publicUrl;
}