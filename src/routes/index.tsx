import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartPulse, Lock, ScanLine, Sparkles, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediVault AI — Your private medical locker" },
      {
        name: "description",
        content:
          "Keep prescriptions and lab reports in one private vault, get a plain-English health timeline, and share securely with a doctor for 24 hours.",
      },
      { property: "og:title", content: "MediVault AI — Your private medical locker" },
      {
        property: "og:description",
        content: "A patient-owned health vault with AI summaries and time-limited doctor access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="gradient-trust flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <HeartPulse className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">MediVault AI</span>
        </div>
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-8 pb-14 text-center">
        <span className="soft-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
          <Lock className="size-3.5" /> Private by default
        </span>
        <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Your medical records,
          <br />
          <span className="bg-clip-text text-primary">owned by you.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Upload a prescription or lab report. MediVault AI reads it, builds your health timeline, and helps you decide
          what to do next — and only you choose what a doctor can see.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Create my vault</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have one</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Upload, title: "Smart upload", text: "Photos or PDFs of prescriptions and lab reports." },
          { icon: Sparkles, title: "Health timeline", text: "Medicines, dates and readings pulled out for you." },
          { icon: HeartPulse, title: "Symptom help", text: "Triage advice that knows your own history." },
          { icon: ScanLine, title: "24-hour doctor link", text: "Share a QR code that expires automatically." },
        ].map((f) => (
          <div key={f.title} className="surface-card p-5 text-left">
            <span className="soft-primary flex size-10 items-center justify-center rounded-xl">
              <f.icon className="size-5" />
            </span>
            <h2 className="mt-4 text-sm font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto flex max-w-md items-center justify-center gap-2">
          <Users className="size-3.5" /> Family profiles supported. MediVault AI does not replace medical advice.
        </p>
      </footer>
    </main>
  );
}
