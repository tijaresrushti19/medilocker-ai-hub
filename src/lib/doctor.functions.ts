import { createServerFn } from "@tanstack/react-start";

export const getSharedVault = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const token = (data.token || "").trim();
    if (!/^[a-f0-9]{20,64}$/.test(token)) return { status: "invalid" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link } = await supabaseAdmin
      .from("share_links")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!link) return { status: "invalid" as const };
    if (link.revoked) return { status: "revoked" as const };
    if (new Date(link.expires_at).getTime() < Date.now()) return { status: "expired" as const };

    const [profile, documents, events, checks] = await Promise.all([
      supabaseAdmin
        .from("patient_profiles")
        .select("full_name, date_of_birth, sex, relationship")
        .eq("id", link.profile_id)
        .maybeSingle(),
      link.document_ids.length
        ? supabaseAdmin
            .from("documents")
            .select("id, title, doc_type, doc_date, ai_summary, storage_path, extracted")
            .in("id", link.document_ids)
        : Promise.resolve({ data: [] as never[] }),
      link.include_timeline
        ? supabaseAdmin
            .from("timeline_events")
            .select("id, category, label, value, event_date")
            .eq("profile_id", link.profile_id)
            .order("event_date", { ascending: false, nullsFirst: false })
            .limit(80)
        : Promise.resolve({ data: [] as never[] }),
      supabaseAdmin
        .from("symptom_checks")
        .select("id, symptoms, urgency, summary, created_at")
        .eq("profile_id", link.profile_id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const files = await Promise.all(
      (documents.data ?? []).map(async (doc) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("medical-docs")
          .createSignedUrl(doc.storage_path, 60 * 30);
        return {
          id: doc.id,
          title: doc.title,
          doc_type: doc.doc_type,
          doc_date: doc.doc_date,
          ai_summary: doc.ai_summary,
          extracted: doc.extracted,
          url: signed?.signedUrl ?? null,
        };
      }),
    );

    await supabaseAdmin
      .from("share_links")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", link.id);

    return {
      status: "ok" as const,
      doctorName: link.doctor_name,
      expiresAt: link.expires_at,
      patient: profile.data,
      documents: files,
      events: events.data ?? [],
      checks: checks.data ?? [],
    };
  });
