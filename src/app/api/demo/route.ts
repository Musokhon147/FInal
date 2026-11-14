import { NextResponse, type NextRequest } from "next/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { DEMO_COOKIE, execute, type Op } from "@/lib/demo/engine";

// Demo mode only: runs browser-side database calls against the sample data.
export async function POST(req: NextRequest) {
  if (!IS_DEMO) return new NextResponse("Not found", { status: 404 });
  const op = (await req.json()) as Op;
  return NextResponse.json(execute(op, req.cookies.get(DEMO_COOKIE)?.value ?? null));
}
