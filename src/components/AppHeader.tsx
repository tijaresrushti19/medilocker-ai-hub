import { Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const navigate = useNavigate();
  return (
    <header className="border-b bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link to="/home" className="flex items-center gap-2">
          <span className="gradient-trust flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <HeartPulse className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">MediVault AI</span>
            {subtitle ? <span className="block text-xs text-muted-foreground">{subtitle}</span> : null}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}
