import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { IS_DEMO, SUPABASE_KEY, SUPABASE_URL } from "./lib/supabase/env";
import { DEMO_COOKIE } from "./lib/demo/engine";

const intl = createIntlMiddleware(routing);
const PROTECTED = ["/dashboard", "/admin"];

export async function proxy(request: NextRequest) {
  // 1. Language routing (/uz, /ru, /en)
  const response = intl(request);

  // 2. Keep the Supabase session fresh (demo mode: just read the demo cookie)
  let user: unknown = null;
  if (IS_DEMO) {
    user = request.cookies.get(DEMO_COOKIE)?.value ?? null;
  } else {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  }

  // 3. Send signed-out visitors away from private areas
  const [, maybeLocale, ...rest] = request.nextUrl.pathname.split("/");
  const locale = (routing.locales as readonly string[]).includes(maybeLocale)
    ? maybeLocale
    : routing.defaultLocale;
  const path = "/" + rest.join("/");
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: "/((?!api|_next|_vercel|demo|.*\\..*).*)",
};
