import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checking, setChecking] = useState(true);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);

  // Redirect to /auth if not signed in
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, navigate]);

  // Check whether user has at least one child (= onboarded)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setChecking(true);
    supabase
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (cancelled) return;
        setHasChildren((count ?? 0) > 0);
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  // Gate: if onboarded === false and not already on onboarding, send there
  useEffect(() => {
    if (!user || hasChildren === null) return;
    const onOnboarding = pathname.startsWith("/onboarding");
    if (!hasChildren && !onOnboarding) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [hasChildren, pathname, navigate, user]);

  if (loading || !user || checking) {
    return (
      <div className="grid min-h-screen place-items-center magical-bg">
        <div className="flex flex-col items-center gap-3">
          <span className="size-3 animate-shimmer rounded-full bg-star shadow-[0_0_20px_var(--star)]" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/45">
            Gathering stardust…
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
