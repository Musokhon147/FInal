export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** No Supabase keys → the site runs on built-in sample data (see src/lib/demo). */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_KEY;

export function publicFileUrl(bucket: "articles" | "covers", path: string) {
  if (IS_DEMO) return `/api/demo/pdf?f=${encodeURIComponent(path)}`;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
