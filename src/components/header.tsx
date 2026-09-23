"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Home", "/"],
  ["Challenges", "/challenges"],
  ["For Business", "/business"],
  ["For Students", "/students"],
] as const;

export function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex w-fit items-center gap-3 font-bold tracking-tight">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-ink text-xl text-accent">✳</span>
          <span>AI Sana <span className="font-normal">Challenge Hub</span></span>
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:gap-x-8">
          {links.map(([label, href]) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`py-1 ${active ? "font-bold underline decoration-2 underline-offset-8" : "text-muted hover:text-ink"}`}>{label}</Link>;
          })}
        </nav>
      </div>
    </header>
  );
}
