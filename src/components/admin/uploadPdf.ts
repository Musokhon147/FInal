import { createClient } from "@/lib/supabase/client";
import { safeFileName } from "@/lib/files";

/** Upload a final PDF to the public "articles" bucket and return its path. */
export async function uploadArticlePdf(file: File) {
  const supabase = createClient();
  const path = `${new Date().getFullYear()}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("articles").upload(path, file, { contentType: "application/pdf" });
  if (error) throw error;
  return path;
}
