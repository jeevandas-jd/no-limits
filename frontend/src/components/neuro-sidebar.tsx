"use client";

import * as React from "react";
import { Activity, Brain, Clock, FileText, HelpCircle, LayoutDashboard, Mic, Plus, Settings } from "lucide-react";

type NavItem = { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; url: string };

type NeuroSidebarProps = {
  onNewAnalysis?: () => void;
  onNavItemClick?: (item: NavItem) => void;
  activePage?: string;
  userName?: string;
  userEmail?: string;
};

export function NeuroSidebar({
  onNewAnalysis,
  onNavItemClick,
  activePage = "analysis",
  userName = "Researcher",
  userEmail = "",
}: NeuroSidebarProps) {
  const navMain: NavItem[] = [
    { title: "New Analysis", icon: Plus, url: "#" },
    { title: "Dashboard", icon: LayoutDashboard, url: "#" },
    { title: "History", icon: Clock, url: "#" },
    { title: "Reports", icon: FileText, url: "#" },
  ];

  const navSecondary: NavItem[] = [
    { title: "Settings", icon: Settings, url: "#" },
    { title: "Get Help", icon: HelpCircle, url: "#" },
  ];

  const handleClick = (item: NavItem) => {
    if (item.title === "New Analysis") onNewAnalysis?.();
    onNavItemClick?.(item);
  };

  return (
    <aside className="">
      {/* Logo */}
      <div className="px-3 py-3 mb-2">
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: "var(--nt-icon)" }} />
          <span className="text-xl font-semibold tracking-tight" style={{ color: "var(--nt-text-hi)" }}>
            no-limits
          </span>
        </div>
      </div>

      {/* New Analysis button */}
      <button
        onClick={() => handleClick(navMain[0])}
        className="nt-nav-btn mx-1 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
        style={{ border: "1px solid var(--nt-glass-border)" }}
      >
        <Mic size={14} />
        New Analysis
      </button>

      {/* Main nav */}
      <div className="flex flex-col gap-0.5 px-1">
        {navMain.slice(1).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.title.toLowerCase();
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className={`nt-nav-btn flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm w-full text-left ${isActive ? "nt-active" : ""}`}
            >
              <Icon size={15} />
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Section label */}
      <div className="mt-4 mb-1 px-4">
        <span
          className="text-[10px] uppercase tracking-widest font-medium"
          style={{ color: "var(--nt-text-ghost)" }}
        >
          Analysis
        </span>
      </div>

      <div className="flex flex-col gap-0.5 px-1">
        {[
          { title: "Brain Regions", icon: Brain, url: "#" },
          { title: "Biomarkers", icon: Activity, url: "#" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className="nt-nav-btn flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm w-full text-left"
            >
              <Icon size={15} />
              {item.title}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Secondary nav */}
      <div className="flex flex-col gap-0.5 px-1 mb-2">
        {navSecondary.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className="nt-nav-btn flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm w-full text-left"
            >
              <Icon size={15} />
              {item.title}
            </button>
          );
        })}
      </div>

      {/* User */}
      <div className="nt-nav-btn mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
          style={{ background: "var(--nt-active)", color: "var(--nt-text-lo)" }}
        >
          {userName?.[0]?.toUpperCase() ?? "R"}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium truncate" style={{ color: "var(--nt-text-md)" }}>{userName}</span>
          {userEmail && (
            <span className="text-[10px] truncate" style={{ color: "var(--nt-text-ghost)" }}>{userEmail}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
