import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to app
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">
          Last updated: April 2026 · Continuary (Beta)
        </p>

        <section className="space-y-8 text-sm leading-relaxed text-foreground/90">

          <div>
            <h2 className="text-base font-semibold mb-2">What Continuary is</h2>
            <p>
              Continuary is a personal productivity tool designed for people with ADHD and similar
              executive-function challenges. It helps you track projects, capture ideas, and maintain
              continuity across work sessions. During the beta period, access is by invitation only.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">What data we collect</h2>
            <p className="mb-2">
              We collect only what you explicitly provide:
            </p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>Your name and email address (from your Manus account, used for login only)</li>
              <li>Projects, tasks, and notes you create inside the app</li>
              <li>Check-in responses (morning, midday, evening)</li>
              <li>Ideas, vault items, and Clarity Engine sessions you submit</li>
              <li>Notification preferences and timezone</li>
              <li>Push notification subscription tokens (stored server-side, never shared)</li>
              <li>Optional feedback you submit via the friction log</li>
            </ul>
            <p className="mt-2">
              We do not collect browsing history, device identifiers, location data, or any data
              outside of what you actively enter into Continuary.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">How we use your data</h2>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>To provide the app’s features (AI check-ins, project memory, Clarity Engine)</li>
              <li>To send push notifications you have opted into</li>
              <li>To improve the product during the beta period based on aggregate patterns</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">AI data processing (third-party service)</h2>
            <p className="mb-2">
              When you use AI-assisted features (daily planning, check-in responses, Clarity Engine,
              project insights), relevant portions of your data are sent to a third-party AI service
              for processing:
            </p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80 mb-2">
              <li><strong>Service:</strong> Google Gemini, accessed via the Manus AI platform proxy</li>
              <li><strong>Data sent:</strong> Project titles, descriptions, next steps; check-in answers; vault item summaries (not raw file content)</li>
              <li><strong>Retention:</strong> Data is processed in real time for your response only. Google does not store or use your content to train models under the Manus API agreement.</li>
              <li><strong>Purpose:</strong> Generating personalised plans, insights, and guidance</li>
            </ul>
            <p className="mb-2">
              You can disable AI features at any time in{" "}
              <a href="/settings" className="underline underline-offset-2 hover:text-foreground">Settings → AI Data &amp; Privacy</a>.
              Disabling AI features does not affect manual note capture, project tracking, or focus sessions.
            </p>
            <p className="text-foreground/70">
              <strong>EU / GDPR users:</strong> The lawful basis for processing your data via the AI
              service is your explicit consent under GDPR Article 6(1)(a), given when you accepted
              the AI data transparency notice on first use. You may withdraw this consent at any time
              via the Settings page; withdrawal does not affect the lawfulness of processing carried
              out before withdrawal. For data subject requests (access, rectification, erasure,
              portability), contact us at{" "}
              <a href="mailto:hello@continuary.app" className="underline underline-offset-2 hover:text-foreground">hello@continuary.app</a>.
              We will respond within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">Data storage and security</h2>
            <p>
              Your data is stored in a managed MySQL database hosted on TiDB Cloud (US region).
              Files you upload to the Vault are stored in Amazon S3 (US East). All connections use
              TLS in transit. We do not sell, rent, or share your personal data with third parties
              for marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">Your rights</h2>
            <p className="mb-2">You can, at any time:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>
                <strong>Delete your account</strong> — go to Settings → scroll to the bottom →
                "Delete Account". This permanently and immediately removes all your data from our
                servers. This action cannot be undone.
              </li>
              <li>
                <strong>Export your data</strong> — data export is on the roadmap and will be
                available before the public launch.
              </li>
              <li>
                <strong>Opt out of notifications</strong> — toggle off in Settings → Notifications
                at any time.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">Beta period notice</h2>
            <p>
              Continuary is currently in closed beta. The product and this policy may change as we
              develop toward a public launch. We will notify beta users of any material changes to
              how their data is handled.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">Contact</h2>
            <p>
              Questions about your data? Reach out via the feedback form in Settings, or email{" "}
              <a
                href="mailto:hello@continuary.app"
                className="underline underline-offset-2 hover:text-foreground"
              >
                hello@continuary.app
              </a>
              .
            </p>
          </div>

        </section>
      </div>
    </div>
  );
}
