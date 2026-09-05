import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { auth, signOut } from "@/auth";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Golf Club Finance",
  description: "Golf club payout and competition finance management",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {session?.user && (
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Golf Club Finance
                </p>
                <p className="text-xs text-slate-500">
                  {session.user.name ?? session.user.email ?? "Signed in"}
                </p>
              </div>

              <form
                action={async () => {
                  "use server";
                  await signOut({
                    redirectTo: "/login",
                  });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Log out
                </button>
              </form>
            </div>
          </header>
        )}

        {children}
      </body>
    </html>
  );
}
