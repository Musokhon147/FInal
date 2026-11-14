import { createClient } from "@/lib/supabase/client";
import { IS_DEMO, publicFileUrl } from "@/lib/supabase/env";
import { safeFileName } from "@/lib/files";

export const MAX_IMAGE_BYTES = 400 * 1024;

/**
 * Upload a logo or photo to the public "covers" bucket and return its URL.
 * In demo mode nothing is stored on a server, so the image is kept inline.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("too-big");
  if (IS_DEMO) {
    return await new Promise((ok, bad) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = bad;
      r.readAsDataURL(file);
    });
  }
  const supabase = createClient();
  const path = `${folder}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("covers").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return publicFileUrl("covers", path);
}
