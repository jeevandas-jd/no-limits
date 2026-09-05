"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/ticease", label: "Home", icon: "\u2302" },
  { href: "/ticease/track", label: "Track", icon: "+" },
  { href: "/ticease/practice", label: "Practice", icon: "\u25CE" },
  { href: "/ticease/insights", label: "Insights", icon: "\u2726" },
  { href: "/ticease/support", label: "Support", icon: "\u2764" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="tic-nav" aria-label="TicEase navigation">
      {ITEMS.map((item) => {
        const active = item.href === "/ticease" ? pathname === "/ticease" : pathname?.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className="tic-nav-item" data-active={active}>
            <span className="tic-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
