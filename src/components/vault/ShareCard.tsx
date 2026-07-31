import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { Check, Copy, Link2, Loader2, ShieldOff, Timer } from "lucide-react";
import { toast } from "sonner";
import { createShareLink, revokeShareLink } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Doc = { id: string; title: string; doc_type: string; doc_date: string | null };
type Share = {
  id: string;
  token: string;
  doctor_name: string | null;
  expires_at: string;
  revoked: boolean;
  document_ids: string[];
  last_viewed_at: string | null;
};

export function ShareCard({
  profileId,
  documents,
  shares,
}: {
  profileId: string;
  documents: Doc[];
  shares: Share[];
}) {
  const create = useServerFn(createShareLink);
  const revoke = useServerFn(revokeShareLink);
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<string[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [hours, setHours] = useState(24);
  const [qr, setQr] = useState<{ url: string; image: string } | null>(null);

  const makeLink = useMutation({
    mutationFn: async () => {
      const row = await create({
        data: {
          profileId,
          documentIds: selected.length ? selected : documents.map((d) => d.id),
          hours,
          doctorName,
          includeTimeline: true,
        },
      });
      const url = `${window.location.origin}/d/${row.token}`;
      const image = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      return { url, image };
    },
    onSuccess: (result) => {
      setQr(result);
      queryClient.invalidateQueries({ queryKey: ["vault", profileId] });
      toast.success("Access link created");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create link"),
  });

  const kill = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", profileId] });
      toast.success("Access revoked");
    },
  });

  return (
    <div className="space-y-4">
      <div className="surface-card p-5">
        <div className="flex items-center gap-3">
          <span className="soft-primary flex size-10 items-center justify-center rounded-xl">
            <Link2 className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Share with doctor</h2>
            <p className="text-xs text-muted-foreground">View-only access that expires by itself.</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Doctor's name (optional)</Label>
            <Input
              id="doctor"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. Mehta"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label>How long should access last?</Label>
            <div className="flex flex-wrap gap-2">
              {[1, 24, 72, 168].map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={hours === h ? "default" : "outline"}
                  onClick={() => setHours(h)}
                >
                  {h === 1 ? "1 hour" : h === 24 ? "24 hours" : h === 72 ? "3 days" : "7 days"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Which documents?</Label>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Upload a document first.</p>
            ) : (
              <div className="space-y-2 rounded-xl border p-3">
                {documents.map((d) => (
                  <label key={d.id} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={selected.includes(d.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) => (v ? [...prev, d.id] : prev.filter((x) => x !== d.id)))
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{d.title}</span>
                    <span className="text-xs text-muted-foreground">{d.doc_date ?? ""}</span>
                  </label>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">
                  Nothing selected means all documents above are shared.
                </p>
              </div>
            )}
          </div>

          <Button disabled={makeLink.isPending || documents.length === 0} onClick={() => makeLink.mutate()}>
            {makeLink.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Create access link
          </Button>
        </div>
      </div>

      {qr && (
        <div className="surface-card p-5 text-center">
          <h3 className="text-sm font-semibold">Show this to your doctor</h3>
          <img src={qr.image} alt="QR code for doctor access" className="mx-auto mt-4 size-52 rounded-xl border" />
          <p className="mt-3 break-all text-xs text-muted-foreground">{qr.url}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              navigator.clipboard.writeText(qr.url);
              toast.success("Link copied");
            }}
          >
            <Copy className="size-4" /> Copy link
          </Button>
        </div>
      )}

      {shares.length > 0 && (
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold">Active and past links</h3>
          <div className="mt-3 space-y-3">
            {shares.map((s) => {
              const expired = new Date(s.expires_at).getTime() < Date.now();
              const dead = s.revoked || expired;
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <span
                    className={`flex size-9 items-center justify-center rounded-lg ${dead ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"}`}
                  >
                    {dead ? <ShieldOff className="size-4" /> : <Check className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.doctor_name || "Shared link"}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="size-3" />
                      {s.revoked
                        ? "Revoked"
                        : expired
                          ? "Expired"
                          : `Expires ${new Date(s.expires_at).toLocaleString()}`}
                      {s.last_viewed_at ? ` · viewed ${new Date(s.last_viewed_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {!dead && (
                    <Button size="sm" variant="ghost" onClick={() => kill.mutate(s.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
