import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const auth = request.headers.get("authorization");

  const username = "admin";
  const password = "pirate123";

  if (!auth) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area"',
      },
    });
  }

  const encoded = auth.split(" ")[1];
  const decoded = atob(encoded);
  const [user, pass] = decoded.split(":");

  if (user === username && pass === password) {
    return NextResponse.next();
  }

  return new NextResponse("Access denied", { status: 403 });
}

export const config = {
  matcher: ["/admin/:path*"],
};