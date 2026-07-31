import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, FileText, HeartPulse, Loader2, Lock, Pill, Timer, TrendingUp } from "lucide-react";
import { getSharedVault } from "@/lib/doctor.functions";

export const Route = createFileRoute("/d/$token")({
  head: () => ({
    meta: [
      { title: "Shared patient record — MediVault AI" },
      { name: "description", content: "Temporary, view-only access to a patient's shared medical summary." },
      { property: "og:title", content: "Shared patient record — MediVault AI" },
      { property: "og:description", content: "Time-limited doctor access to a patient's shared documents." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorView,
});

const ICONS = { medication: Pill, reading: TrendingUp, diagnosis: Activity } as const;

function DoctorView() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedVault);
  const { data, isLoading } = useQuery({
    queryKey: ["shared", token],
    queryFn: () => fetchShared({ data: { token } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.status !== "ok") {
    const message =
      data?.status === "expired"
        ? "This access link has expired."
        : data?.status === "revoked"
          ? "The patient has revoked this access link."
          : "This access link is not valid.";
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="surface-card max-w-sm p-8 text-center">
          <span className="soft-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-4 text-base font-semibold">No access</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <p className="mt-2 text-xs text-muted-foreground">Ask the patient to generate a new link or QR code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="gradient-trust text-primary-foreground">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <HeartPulse className="size-4" /> MediVault AI · Doctor view
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{data.patient?.full_name}</h1>
          <p className="text-sm opacity-90">
            {data.patient?.date_of_birth ? `Born ${data.patient.date_of_birth} · ` : ""}
            Shared {data.doctorName ? `with ${data.doctorName}` : "by the patient"}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs">
            <Timer className="size-3.5" /> View-only until {new Date(data.expiresAt).toLocaleString()}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <section>
          <h2 className="text-sm font-semibold">AI summaries of shared documents</h2>
          <div className="mt-3 space-y-3">
            {data.documents.length === 0 && (
              <p className="surface-card p-5 text-sm text-muted-foreground">No documents were shared.</p>
            )}
            {data.documents.map((doc) => (
              <div key={doc.id} className="surface-card p-5">
                <div className="flex items-start gap-3">
                  <span className="soft-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.doc_type.replace(/_/g, " ")} · {doc.doc_date ?? "no date"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{doc.ai_summary}</p>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open original file
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {data.events.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold">Health timeline</h2>
            <div className="surface-card mt-3 divide-y">
              {data.events.map((e) => {
                const Icon = ICONS[e.category as keyof typeof ICONS] ?? FileText;
                return (
                  <div key={e.id} className="flex items-center gap-3 p-4">
                    <Icon className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 text-sm">
                      {e.label}
                      {e.value ? <span className="text-muted-foreground"> — {e.value}</span> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">{e.event_date ?? ""}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.checks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold">Recent patient-reported symptoms</h2>
            <div className="mt-3 space-y-3">
              {data.checks.map((c) => (
                <div key={c.id} className="surface-card p-5">
                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm italic text-muted-foreground">“{c.symptoms}”</p>
                  <p className="mt-2 text-sm">{c.summary}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Access is time-limited and can be revoked by the patient at any moment.
        </p>
      </main>
    </div>
  );
}
