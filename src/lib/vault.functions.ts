import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("patient_profiles")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    full_name: string;
    relationship: string;
    date_of_birth?: string | null;
    sex?: string | null;
    is_primary?: boolean;
  }) => input)
  .handler(async ({ data, context }) => {
    const name = data.full_name?.trim();
    if (!name || name.length > 80) throw new Error("Please enter a name (up to 80 characters).");
    const { data: row, error } = await context.supabase
      .from("patient_profiles")
      .insert({
        owner_id: context.userId,
        full_name: name,
        relationship: (data.relationship || "Family").slice(0, 40),
        date_of_birth: data.date_of_birth || null,
        sex: data.sex || null,
        is_primary: Boolean(data.is_primary),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("patient_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getVault = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profileId: string }) => input)
  .handler(async ({ data, context }) => {
    const [profile, documents, events, checks, shares] = await Promise.all([
      context.supabase.from("patient_profiles").select("*").eq("id", data.profileId).maybeSingle(),
      context.supabase
        .from("documents")
        .select("*")
        .eq("profile_id", data.profileId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("timeline_events")
        .select("*")
        .eq("profile_id", data.profileId)
        .order("event_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      context.supabase
        .from("symptom_checks")
        .select("*")
        .eq("profile_id", data.profileId)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("share_links")
        .select("*")
        .eq("profile_id", data.profileId)
        .order("created_at", { ascending: false }),
    ]);
    if (!profile.data) throw new Error("Profile not found");
    return {
      profile: profile.data,
      documents: documents.data ?? [],
      events: events.data ?? [],
      checks: checks.data ?? [],
      shares: shares.data ?? [],
    };
  });

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    profileId: string;
    storagePath: string;
    filename: string;
    mimeType: string;
    dataUrl: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const { extractFromDocument } = await import("./vault.server");
    const extracted = await extractFromDocument({
      filename: data.filename.slice(0, 120),
      mimeType: data.mimeType,
      dataUrl: data.dataUrl,
      fallbackTitle: data.filename.replace(/\.[a-z0-9]+$/i, "").slice(0, 80),
    });

    const { data: doc, error } = await context.supabase
      .from("documents")
      .insert({
        owner_id: context.userId,
        profile_id: data.profileId,
        title: extracted.title,
        doc_type: extracted.doc_type,
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        doc_date: extracted.doc_date,
        ai_summary: extracted.summary,
        extracted: JSON.parse(JSON.stringify(extracted)),
        status: "ready",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const events = [
      ...extracted.medications.map((m) => ({
        category: "medication",
        label: m.name,
        value: [m.dose, m.frequency].filter(Boolean).join(" · ") || null,
      })),
      ...extracted.values.map((v) => ({ category: "reading", label: v.label, value: v.value })),
      ...extracted.diagnoses.map((d) => ({ category: "diagnosis", label: d, value: null })),
    ].filter((e) => e.label);

    if (events.length) {
      await context.supabase.from("timeline_events").insert(
        events.map((e) => ({
          owner_id: context.userId,
          profile_id: data.profileId,
          document_id: doc.id,
          event_date: extracted.doc_date,
          category: e.category,
          label: String(e.label).slice(0, 120),
          value: e.value ? String(e.value).slice(0, 120) : null,
          detail: doc.title,
        })),
      );
    }
    return doc;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");
    const { data: signed, error } = await context.supabase.storage
      .from("medical-docs")
      .createSignedUrl(doc.storage_path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const runSymptomCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profileId: string; symptoms: string }) => input)
  .handler(async ({ data, context }) => {
    const symptoms = data.symptoms?.trim();
    if (!symptoms || symptoms.length < 5) throw new Error("Please describe your symptoms in a bit more detail.");
    if (symptoms.length > 1500) throw new Error("Please keep the description under 1500 characters.");

    const { buildHistoryText, triageSymptoms } = await import("./vault.server");
    const [profile, docs, events] = await Promise.all([
      context.supabase.from("patient_profiles").select("*").eq("id", data.profileId).maybeSingle(),
      context.supabase
        .from("documents")
        .select("title, doc_type, doc_date, ai_summary")
        .eq("profile_id", data.profileId),
      context.supabase
        .from("timeline_events")
        .select("category, label, value, event_date")
        .eq("profile_id", data.profileId),
    ]);
    if (!profile.data) throw new Error("Profile not found");

    const result = await triageSymptoms({
      symptoms,
      profileLabel: `${profile.data.full_name}${profile.data.date_of_birth ? `, born ${profile.data.date_of_birth}` : ""}`,
      history: buildHistoryText(docs.data ?? [], events.data ?? []),
    });

    const { data: row, error } = await context.supabase
      .from("symptom_checks")
      .insert({
        owner_id: context.userId,
        profile_id: data.profileId,
        symptoms,
        urgency: result.urgency,
        summary: result.summary,
        advice: result.advice,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    profileId: string;
    documentIds: string[];
    hours: number;
    doctorName?: string;
    includeTimeline?: boolean;
  }) => input)
  .handler(async ({ data, context }) => {
    const { makeShareToken } = await import("./vault.server");
    const hours = Math.min(Math.max(Number(data.hours) || 24, 1), 168);
    const { data: row, error } = await context.supabase
      .from("share_links")
      .insert({
        owner_id: context.userId,
        profile_id: data.profileId,
        token: makeShareToken(),
        doctor_name: data.doctorName?.slice(0, 80) || null,
        document_ids: data.documentIds.slice(0, 50),
        include_timeline: data.includeTimeline ?? true,
        expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("share_links").update({ revoked: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
