import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/create", label: "Create", icon: "✨" },
  { to: "/library", label: "Library", icon: "📚" },
  { to: "/passport", label: "Passport", icon: "🗺️" },
  { to: "/settings", label: "Profile", icon: "👤" },
] as const;

function AmbientSky() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-lavender/15 blur-[140px]" />
      <div className="absolute -bottom-[10%] -left-[10%] h-[55%] w-[55%] rounded-full bg-peach/12 blur-[120px]" />
      <div className="absolute top-1/3 left-1/2 h-[30%] w-[30%] -translate-x-1/2 rounded-full bg-mint/8 blur-[120px]" />
      {/* Twinkling stars */}
      <div className="absolute inset-0">
        {Array.from({ length: 28 }).map((_, i) => {
          const top = (i * 53) % 100;
          const left = (i * 37 + 7) % 100;
          const delay = (i % 7) * 0.4;
          const size = (i % 3) + 1;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-star/70 shadow-[0_0_8px_currentColor] animate-twinkle"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen magical-bg">
      <AmbientSky />

      <header className="sticky top-0 z-40 border-b border-hairline/60 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-star to-peach shadow-[0_0_20px_oklch(0.85_0.16_88/0.35)] transition-transform group-hover:scale-105">
              <span className="font-display text-base font-bold text-ink">A</span>
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-foreground">
              Adventure Club
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 rounded-full border border-hairline bg-surface/60 p-1 text-sm">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 font-medium transition-colors",
                    active
                      ? "bg-foreground/10 text-foreground"
                      : "text-foreground/55 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="hidden sm:flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              <span className="grid size-5 place-items-center rounded-full bg-mint/30 ring-1 ring-mint/40 text-[10px]">
                🦁
              </span>
              Leo's Profile
            </Link>
            <Link
              to="/settings"
              className="grid size-9 place-items-center rounded-full border border-hairline bg-surface/60 text-foreground/60 hover:text-foreground transition-colors"
              aria-label="Settings"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10 md:py-14">{children}</main>

      {/* Persistent bottom nav */}
      <nav className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-hairline bg-background/85 px-2 py-1.5 backdrop-blur-xl shadow-lg">
          {NAV.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  active ? "bg-foreground/10 text-foreground" : "text-foreground/55",
                )}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="relative z-10 mt-10 pb-24 md:pb-10 text-center">
        <div className="mx-auto inline-flex flex-col items-center gap-3">
          <span className="size-1.5 rounded-full bg-star/60 shadow-[0_0_10px_var(--star)] animate-shimmer" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/35">
            Premium Adventurer Access Active
          </p>
          <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] text-foreground/30">
            <span>Privacy</span>
            <span>Support</span>
            <span>Family Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
