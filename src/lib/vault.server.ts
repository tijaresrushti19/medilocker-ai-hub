import { askAiForJson } from "./ai.server";

export type ExtractedDoc = {
  title: string;
  doc_type: string;
  doc_date: string | null;
  summary: string;
  medications: Array<{ name: string; dose?: string; frequency?: string }>;
  values: Array<{ label: string; value: string; date?: string }>;
  diagnoses: string[];
};

export async function extractFromDocument(input: {
  filename: string;
  mimeType: string;
  dataUrl: string | null;
  fallbackTitle: string;
}): Promise<ExtractedDoc> {
  const empty: ExtractedDoc = {
    title: input.fallbackTitle,
    doc_type: "other",
    doc_date: null,
    summary: "No AI summary available for this file.",
    medications: [],
    values: [],
    diagnoses: [],
  };

  if (!input.dataUrl) return empty;

  const isImage = input.mimeType.startsWith("image/");
  const blocks = [
    {
      type: "text" as const,
      text: `Read this medical document ("${input.filename}") and return JSON with keys:
title (short human title), doc_type (one of prescription, lab_report, scan, discharge_summary, other),
doc_date (YYYY-MM-DD or null), summary (2-3 plain sentences a non-medical person understands),
medications (array of {name, dose, frequency}), values (array of {label, value, date} for lab/vital readings such as blood pressure, HbA1c, cholesterol),
diagnoses (array of short strings). Use empty arrays when nothing is found. Never invent data.`,
    },
    isImage
      ? { type: "image_url" as const, image_url: { url: input.dataUrl } }
      : {
          type: "file" as const,
          file: { filename: input.filename, file_data: input.dataUrl },
        },
  ];

  try {
    const out = await askAiForJson({
      system:
        "You are a careful medical document reader. You only report what the document actually contains. Respond with strict JSON.",
      blocks,
    });
    return {
      title: typeof out.title === "string" && out.title.trim() ? out.title : input.fallbackTitle,
      doc_type: typeof out.doc_type === "string" ? out.doc_type : "other",
      doc_date: typeof out.doc_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.doc_date) ? out.doc_date : null,
      summary: typeof out.summary === "string" ? out.summary : empty.summary,
      medications: Array.isArray(out.medications) ? (out.medications as ExtractedDoc["medications"]).slice(0, 25) : [],
      values: Array.isArray(out.values) ? (out.values as ExtractedDoc["values"]).slice(0, 40) : [],
      diagnoses: Array.isArray(out.diagnoses) ? (out.diagnoses as string[]).slice(0, 15) : [],
    };
  } catch (error) {
    console.error("Document extraction failed", error);
    return { ...empty, summary: "We saved your file, but the AI could not read it this time." };
  }
}

export type TriageResult = {
  urgency: "self_care" | "see_doctor_soon" | "urgent";
  summary: string;
  advice: string[];
};

export async function triageSymptoms(input: {
  symptoms: string;
  profileLabel: string;
  history: string;
}): Promise<TriageResult> {
  try {
    const out = await askAiForJson({
      system:
        "You are a cautious health triage assistant. You never diagnose. You explain in simple language, reference the person's own uploaded history when relevant, and always advise professional care when uncertain. Respond with strict JSON.",
      blocks: [
        {
          type: "text",
          text: `Person: ${input.profileLabel}
Their saved health history (from their own uploaded documents):
${input.history || "No documents uploaded yet."}

Reported symptoms: ${input.symptoms}

Return JSON: { "urgency": "self_care" | "see_doctor_soon" | "urgent", "summary": "2-4 plain sentences that connect the symptoms to their history where relevant", "advice": ["3-5 short next steps"] }`,
        },
      ],
    });
    const urgency = out.urgency;
    return {
      urgency:
        urgency === "self_care" || urgency === "see_doctor_soon" || urgency === "urgent"
          ? urgency
          : "see_doctor_soon",
      summary:
        typeof out.summary === "string"
          ? out.summary
          : "We could not analyse this fully. Please speak to a doctor about these symptoms.",
      advice: Array.isArray(out.advice) ? (out.advice as string[]).slice(0, 6) : [],
    };
  } catch (error) {
    console.error("Triage failed", error);
    return {
      urgency: "see_doctor_soon",
      summary: "The AI is unavailable right now. If your symptoms are severe or worsening, contact a doctor.",
      advice: ["Try again in a few minutes", "Seek urgent care if symptoms are severe"],
    };
  }
}

export function buildHistoryText(
  documents: Array<{ title: string; doc_type: string; doc_date: string | null; ai_summary: string | null }>,
  events: Array<{ category: string; label: string; value: string | null; event_date: string | null }>,
): string {
  const docLines = documents
    .slice(0, 25)
    .map((d) => `- ${d.doc_date ?? "undated"} ${d.doc_type}: ${d.title} — ${d.ai_summary ?? ""}`);
  const eventLines = events
    .slice(0, 60)
    .map((e) => `- ${e.event_date ?? "undated"} ${e.category}: ${e.label}${e.value ? ` = ${e.value}` : ""}`);
  return [...docLines, ...eventLines].join("\n");
}

export function makeShareToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
