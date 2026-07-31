import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronRight, Loader2, Plus, ShieldCheck, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createProfile, listProfiles } from "@/lib/vault.functions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "My Health — MediVault AI" },
      { name: "description", content: "Your profiles, documents and health timeline in one private place." },
      { property: "og:title", content: "My Health — MediVault AI" },
      { property: "og:description", content: "Your private health vault." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const fetchProfiles = useServerFn(listProfiles);
  const addProfile = useServerFn(createProfile);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => fetchProfiles(),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Self");
  const [dob, setDob] = useState("");

  const create = useMutation({
    mutationFn: (isPrimary: boolean) =>
      addProfile({
        data: {
          full_name: name,
          relationship: isPrimary ? "Self" : relationship,
          date_of_birth: dob || null,
          is_primary: isPrimary,
        },
      }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setOpen(false);
      setName("");
      setDob("");
      toast.success("Profile created");
      navigate({ to: "/vault/$profileId", params: { profileId: row.id } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create profile"),
  });

  const hasPrimary = (profiles ?? []).some((p) => p.is_primary);

  return (
    <div className="min-h-screen">
      <AppHeader subtitle="My Health" />

      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">My Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose whose records you want to open, or add a family member.
        </p>

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (profiles ?? []).length === 0 ? (
          <div className="surface-card mt-6 p-8 text-center">
            <span className="soft-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
              <UserPlus className="size-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold">Set up your primary profile</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              This is your own health record. You can add family members afterwards.
            </p>
            <div className="mt-5">
              <NewProfileDialog
                open={open}
                setOpen={setOpen}
                name={name}
                setName={setName}
                relationship={relationship}
                setRelationship={setRelationship}
                dob={dob}
                setDob={setDob}
                primary
                onSubmit={() => create.mutate(true)}
                pending={create.isPending}
                trigger={
                  <Button size="lg">
                    <Plus className="size-4" /> Create my profile
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              {(profiles ?? []).map((p) => (
                <Link
                  key={p.id}
                  to="/vault/$profileId"
                  params={{ profileId: p.id }}
                  className="surface-card flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="soft-primary flex size-11 items-center justify-center rounded-xl text-base font-semibold">
                    {p.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.is_primary ? "Primary profile" : p.relationship}
                      {p.date_of_birth ? ` · born ${p.date_of_birth}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <NewProfileDialog
                open={open}
                setOpen={setOpen}
                name={name}
                setName={setName}
                relationship={relationship}
                setRelationship={setRelationship}
                dob={dob}
                setDob={setDob}
                primary={!hasPrimary}
                onSubmit={() => create.mutate(!hasPrimary)}
                pending={create.isPending}
                trigger={
                  <Button variant="outline">
                    <UserPlus className="size-4" /> Add family member
                  </Button>
                }
              />
              <Button asChild>
                <Link
                  to="/vault/$profileId"
                  params={{ profileId: (profiles ?? [])[0].id }}
                  search={{ tab: "documents" }}
                >
                  <Upload className="size-4" /> Upload new doc
                </Link>
              </Button>
            </div>
          </>
        )}

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Everything here is private until you create a doctor link.
        </p>
      </main>
    </div>
  );
}

function NewProfileDialog(props: {
  open: boolean;
  setOpen: (v: boolean) => void;
  name: string;
  setName: (v: string) => void;
  relationship: string;
  setRelationship: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  primary: boolean;
  onSubmit: () => void;
  pending: boolean;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.primary ? "Your primary profile" : "Add a family member"}</DialogTitle>
          <DialogDescription>
            {props.primary
              ? "This record belongs to you."
              : "Sub-profiles let you keep a parent's or child's records separate."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pname">Full name</Label>
            <Input id="pname" value={props.name} onChange={(e) => props.setName(e.target.value)} maxLength={80} />
          </div>
          {!props.primary && (
            <div className="space-y-1.5">
              <Label htmlFor="prel">Relationship</Label>
              <Input
                id="prel"
                value={props.relationship}
                onChange={(e) => props.setRelationship(e.target.value)}
                placeholder="Mother, Son, Partner…"
                maxLength={40}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pdob">Date of birth (optional)</Label>
            <Input id="pdob" type="date" value={props.dob} onChange={(e) => props.setDob(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={props.onSubmit} disabled={props.pending}>
            {props.pending && <Loader2 className="mr-2 size-4 animate-spin" />} Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
