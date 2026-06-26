import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// "Add another adventurer" enters the full onboarding flow.
export const Route = createFileRoute("/_authenticated/adventurers/new")({
  component: RedirectToOnboarding,
});

function RedirectToOnboarding() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/onboarding", replace: true });
  }, [navigate]);
  return null;
}
