import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // roda em tudo, menos assets estáticos e a logo
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ayalogo.png).*)"],
};
