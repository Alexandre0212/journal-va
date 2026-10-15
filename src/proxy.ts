import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACTORS = new Set(["u_alexandre_sankara", "u_5MKSBjCyBoc8Pi6hC78kuQ", "u_va_test"]);
const ADMINS = new Set(["u_alexandre_sankara", "u_5MKSBjCyBoc8Pi6hC78kuQ"]);

export function proxy(request: NextRequest) {
  if (process.env.AUTH_MODE === "entra") return NextResponse.next();
  if (process.env.NODE_ENV === "production" && process.env.AUTH_MODE !== "dev") return NextResponse.next();
  const chosen = request.cookies.get("va-as")?.value;
  const actor = chosen && ACTORS.has(chosen) ? chosen : process.env.DEV_USER_ID || "u_alexandre_sankara";
  if (!ADMINS.has(actor)) return NextResponse.redirect(new URL("/non-autorise", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/pilotage", "/pilotage/:path*", "/equipe", "/equipe/:path*"],
};
