import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { runSymptomCheck } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Check = {
  id: string;
  symptoms: string;
  urgency: string | null;
  summary: string | null;
  advice: unknown;
  created_at: string;
};

const URGENCY: Record<string, { label: string; className: string }> = {
  self_care: { label: "Likely self-care", className: "bg-success/15 text-success" },
  see_doctor_soon: { label: "See a doctor soon", className: "bg-warning/20 text-warning-foreground" },
  urgent: { label: "Seek care urgently", className: "bg-destructive/15 text-destructive" },
};

export function SymptomCard({ profileId, checks }: { profileId: string; checks: Check[] }) {
  const run = useServerFn(runSymptomCheck);
  const queryClient = useQueryClient();
  const [symptoms, setSymptoms] = useState("");

  const check = useMutation({
    mutationFn: () => run({ data: { profileId, symptoms } }),
    onSuccess: () => {
      setSymptoms("");
      queryClient.invalidateQueries({ queryKey: ["vault", profileId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not analyse symptoms"),
  });

  return (
    <div className="space-y-4">
      <div className="surface-card p-5">
        <div className="flex items-center gap-3">
          <span className="soft-primary flex size-10 items-center justify-center rounded-xl">
            <Stethoscope className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">How are you feeling?</h2>
            <p className="text-xs text-muted-foreground">
              We compare your symptoms with your own uploaded history.
            </p>
          </div>
        </div>
        <Textarea
          className="mt-4"
          rows={4}
          maxLength={1500}
          placeholder="For example: headache since yesterday, worse in the morning, feeling dizzy when standing up."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        <Button className="mt-3" disabled={check.isPending} onClick={() => check.mutate()}>
          {check.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Get a triage summary
        </Button>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          This is guidance only, not a diagnosis. In an emergency, call your local emergency number.
        </p>
      </div>

      {checks.map((c) => {
        const tone = URGENCY[c.urgency ?? "see_doctor_soon"] ?? URGENCY.see_doctor_soon;
        const advice = Array.isArray(c.advice) ? (c.advice as string[]) : [];
        return (
          <div key={c.id} className="surface-card p-5">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone.className}`}>{tone.label}</span>
              <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground italic">“{c.symptoms}”</p>
            <p className="mt-3 text-sm">{c.summary}</p>
            {advice.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {advice.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
