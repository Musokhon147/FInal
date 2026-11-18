import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase email-confirmation / magic-link redirect target
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";
  const locale = next.match(/^\/(uz|ru|en)(?=\/|$)/)?.[1] ?? "uz";

  // Supabase sends errors back as ?error=...&error_code=otp_expired
  if (searchParams.get("error_code") || searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/${locale}/login?link=expired`);
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Opened in another browser or device: the email is confirmed, but this browser has no session yet
    if (error) return NextResponse.redirect(`${origin}/${locale}/login?confirmed=1`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
