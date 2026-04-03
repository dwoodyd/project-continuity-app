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
              <li>To provide the app's features (AI check-ins, project memory, Clarity Engine)</li>
              <li>To send push notifications you have opted into</li>
              <li>To improve the product during the beta period based on aggregate patterns</li>
            </ul>
            <p className="mt-2">
              Your notes and check-in content are sent to an AI language model to generate
              personalised guidance. This content is processed in real time and is not used to train
              AI models.
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
