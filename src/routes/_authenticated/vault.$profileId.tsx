import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Activity, FileText, Loader2, Pill, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { deleteDocument, getDocumentUrl, getVault } from "@/lib/vault.functions";
import { AppHeader } from "@/components/AppHeader";
import { UploadCard } from "@/components/vault/UploadCard";
import { SymptomCard } from "@/components/vault/SymptomCard";
import { ShareCard } from "@/components/vault/ShareCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "timeline" | "documents" | "symptoms" | "share";

export const Route = createFileRoute("/_authenticated/vault/$profileId")({
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => {
    const tab = search.tab;
    return {
      tab:
        tab === "documents" || tab === "symptoms" || tab === "share" || tab === "timeline"
          ? (tab as Tab)
          : "timeline",
    };
  },
  head: () => ({
    meta: [
      { title: "Health vault — MediVault AI" },
      { name: "description", content: "Documents, health timeline, symptom checks and doctor sharing." },
      { property: "og:title", content: "Health vault — MediVault AI" },
      { property: "og:description", content: "Your private health records and AI timeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VaultPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-lg font-semibold">We couldn't open this vault</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button asChild className="mt-4">
        <Link to="/home">Back to My Health</Link>
      </Button>
    </div>
  ),
});

const CATEGORY_ICON = {
  medication: Pill,
  reading: TrendingUp,
  diagnosis: Activity,
  note: FileText,
} as const;

function VaultPage() {
  const { profileId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const fetchVault = useServerFn(getVault);
  const removeDoc = useServerFn(deleteDocument);
  const openDoc = useServerFn(getDocumentUrl);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vault", profileId],
    queryFn: () => fetchVault({ data: { profileId } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeDoc({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", profileId] });
      toast.success("Document deleted");
    },
  });

  const view = useMutation({
    mutationFn: (id: string) => openDoc({ data: { id } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
    onError: () => toast.error("Could not open this file"),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader subtitle={data.profile.full_name} />

      <main className="mx-auto max-w-3xl px-5 py-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> My Health
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <span className="soft-primary flex size-12 items-center justify-center rounded-2xl text-lg font-semibold">
            {data.profile.full_name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{data.profile.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              {data.profile.is_primary ? "Primary profile" : data.profile.relationship} ·{" "}
              {data.documents.length} document{data.documents.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => navigate({ search: { tab: value as Tab } })}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-5 space-y-3">
            {data.events.length === 0 ? (
              <EmptyState text="Your timeline fills up automatically once you upload a prescription or lab report." />
            ) : (
              data.events.map((e) => {
                const Icon = CATEGORY_ICON[(e.category as keyof typeof CATEGORY_ICON) ?? "note"] ?? FileText;
                return (
                  <div key={e.id} className="surface-card flex items-start gap-3 p-4">
                    <span className="soft-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {e.label}
                        {e.value ? <span className="text-muted-foreground"> — {e.value}</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.event_date ?? "No date"} · {e.category}
                        {e.detail ? ` · from ${e.detail}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-5 space-y-4">
            <UploadCard profileId={profileId} />
            {data.documents.length === 0 ? (
              <EmptyState text="No documents yet." />
            ) : (
              data.documents.map((doc) => (
                <div key={doc.id} className="surface-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="soft-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.doc_type.replace(/_/g, " ")} · {doc.doc_date ?? "no date"}
                      </p>
                      {doc.ai_summary && <p className="mt-2 text-sm text-muted-foreground">{doc.ai_summary}</p>}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => view.mutate(doc.id)}>
                          View file
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => del.mutate(doc.id)}>
                          <Trash2 className="size-4" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="symptoms" className="mt-5">
            <SymptomCard profileId={profileId} checks={data.checks} />
          </TabsContent>

          <TabsContent value="share" className="mt-5">
            <ShareCard profileId={profileId} documents={data.documents} shares={data.shares} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="surface-card p-8 text-center text-sm text-muted-foreground">{text}</div>
  );
}
