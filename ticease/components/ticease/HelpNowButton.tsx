"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HelpNowButton() {
  const pathname = usePathname();
  if (pathname === "/ticease/help") return null;

  return (
    <Link href="/ticease/help" className="tic-help-fab" aria-label="Get help now">
      <span aria-hidden="true">&#9888;</span> Help Now
    </Link>
  );
}
