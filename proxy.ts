import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((request) => {
  const user = request.auth?.user;
  const pathname = request.nextUrl.pathname;

  if (!user) {
    if (pathname === "/login") return NextResponse.next();
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.role;

  if (pathname === "/account/password" || pathname.startsWith("/account/password/")) {
    return NextResponse.next();
  }

  /* Accounts contain private club financial information: Treasurer only. */
  if (pathname === "/accounts" || pathname.startsWith("/accounts/")) {
    if (role === "TREASURER") return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  if (pathname === "/login") {
    if (role === "TOPUP_ADMIN") return NextResponse.redirect(new URL("/payouts/top-ups", request.nextUrl));
    if (role === "SECTION_USER") return NextResponse.redirect(new URL("/payouts/new", request.nextUrl));
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  if (role === "ADMIN") return NextResponse.next();
  if (role === "TREASURER") return NextResponse.next();

  if (role === "TOPUP_ADMIN") {
    if (pathname === "/payouts/top-ups" || pathname.startsWith("/payouts/top-ups/")) return NextResponse.next();
    return NextResponse.redirect(new URL("/payouts/top-ups", request.nextUrl));
  }

  if (role === "SECTION_USER") {
    if (
      pathname === "/payouts/new" || pathname.startsWith("/payouts/new/") ||
      pathname === "/payouts/completed" || pathname.startsWith("/payouts/completed/")
    ) return NextResponse.next();
    return NextResponse.redirect(new URL("/payouts/new", request.nextUrl));
  }

  return NextResponse.redirect(new URL("/login", request.nextUrl));
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)",
  ],
};
