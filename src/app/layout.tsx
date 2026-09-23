import type { Metadata } from "next";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Sana Challenge Hub",
  description: "Turn business problems into student-ready challenges.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <footer className="border-t border-ink/10">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 py-7 text-xs text-muted sm:flex-row sm:px-10">
            <span className="font-semibold text-ink">AI Sana Challenge Hub</span>
            <span>Business challenges. Student potential. Shared progress.</span>
            <span>Hackathon MVP · UI preview</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
