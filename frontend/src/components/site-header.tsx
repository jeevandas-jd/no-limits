"use client";

import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconSun, IconMoon } from "@tabler/icons-react";

type SiteHeaderProps = {
  title?: string;
  subtitle?: string;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
};

export function SiteHeader({
  title = "Cognitive Analysis",
  subtitle,
  sidebarOpen = true,
  onToggleSidebar,
  isDark = false,
  onToggleTheme,
}: SiteHeaderProps) {
  return (
    <header
      className="flex items-center gap-3 px-4 h-11 shrink-0"
      style={{
        background: "var(--nt-hdr)",
        borderBottom: "1px solid var(--nt-hdr-border)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        transition: "background 0.3s, border-color 0.3s",
      }}
    >
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="nt-nav-btn flex items-center justify-center w-7 h-7 rounded-md shrink-0"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen
            ? <IconLayoutSidebarLeftCollapse size={16} stroke={1.6} />
            : <IconLayoutSidebarLeftExpand size={16} stroke={1.6} />
          }
        </button>
      )}

      <div
        className="w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0"
        style={{ border: "1.5px solid var(--nt-text-xs)" }}
      >
        <div className="w-1.5 h-1.5 rounded-[1px]" style={{ background: "var(--nt-text-xs)" }} />
      </div>

      <span
        className="text-[13px] font-medium tracking-tight"
        style={{ color: "var(--nt-text-md)", fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {title}
      </span>

      {subtitle && (
        <>
          <span style={{ color: "var(--nt-text-ghost)" }} className="text-sm">/</span>
          <span className="text-[13px]" style={{ color: "var(--nt-text-xs)" }}>{subtitle}</span>
        </>
      )}

      <div className="flex-1" />

      {/* Theme toggle */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          className="nt-nav-btn flex items-center justify-center w-7 h-7 rounded-md shrink-0"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark
            ? <IconSun size={15} stroke={1.6} />
            : <IconMoon size={15} stroke={1.6} />
          }
        </button>
      )}
    </header>
  );
}
