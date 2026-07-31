import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveDocument } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export function UploadCard({ profileId }: { profileId: string }) {
  const save = useServerFn(saveDocument);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_BYTES) throw new Error("Please choose a file under 8 MB.");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
      const path = `${userId}/${profileId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("medical-docs").upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw new Error(error.message);

      const dataUrl = await readAsDataUrl(file);
      return save({
        data: {
          profileId,
          storagePath: path,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", profileId] });
      toast.success("Document saved and added to the timeline");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Upload failed"),
    onSettled: () => setBusy(false),
  });

  return (
    <div className="surface-card p-5">
      <div className="flex items-start gap-4">
        <span className="soft-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Upload className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Upload new doc</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Take a photo of a prescription or pick a PDF lab report. The AI reads it for you.
          </p>
          <label className="mt-4 inline-flex">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                upload.mutate(file);
              }}
            />
            <Button asChild disabled={busy}>
              <span>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                {busy ? "Reading document…" : "Choose file"}
              </span>
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
}
