import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">
          Last updated: April 2026 · Continuary (Beta)
        </p>

        <section className="space-y-8 text-sm leading-relaxed text-foreground/90">

          <div>
            <h2 className="text-base font-semibold mb-2">1. Acceptance of terms</h2>
            <p>
              By creating an account and using Continuary, you agree to these Terms of Service
              and our{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the service. These terms apply to the closed beta
              period and will be updated before public launch.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">2. Beta service</h2>
            <p>
              Continuary is currently in closed beta. The service is provided for evaluation
              purposes only. Features may change, be removed, or become unavailable without
              notice. We do not guarantee uptime, data retention, or feature availability during
              the beta period. Beta access is by invitation only and may be revoked at any time.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">3. Your account</h2>
            <p className="mb-2">
              You are responsible for maintaining the security of your account. You must not
              share your access credentials or invite codes with others. You may only create one
              account per person. We reserve the right to suspend or terminate accounts that
              violate these terms.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">4. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to reverse-engineer, scrape, or abuse the API</li>
              <li>Upload content that is illegal, harmful, or infringes third-party rights</li>
              <li>Circumvent invite-only access controls or share access with unauthorised users</li>
              <li>Use the AI features to generate harmful, deceptive, or abusive content</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">5. Your content</h2>
            <p>
              You retain ownership of all content you create in Continuary — your projects,
              notes, check-ins, and vault items. By using the service, you grant us a limited
              licence to store and process your content solely to provide the service to you.
              We do not sell, share, or use your content for advertising.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">6. AI-generated content</h2>
            <p>
              AI-generated plans, insights, and responses are provided for informational
              purposes only. They do not constitute professional medical, psychological,
              financial, or legal advice. You are responsible for any decisions you make based
              on AI-generated content.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">7. No warranty</h2>
            <p>
              The service is provided "as is" and "as available" without warranties of any kind,
              express or implied. We do not warrant that the service will be uninterrupted,
              error-free, or free of harmful components. Your use of the service is at your
              own risk.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Continuary and its creators shall not be
              liable for any indirect, incidental, special, or consequential damages arising from
              your use of or inability to use the service, including loss of data.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">9. Beta data retention</h2>
            <p>
              We will make reasonable efforts to preserve your data during the beta period.
              However, we may reset or delete beta data at any time with reasonable notice.
              We recommend using the data export feature in Settings to keep a local copy of
              your data.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">10. Changes to these terms</h2>
            <p>
              We may update these terms as the product evolves. We will notify beta users of
              material changes via the app or email. Continued use after changes constitutes
              acceptance of the updated terms.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">11. Contact</h2>
            <p>
              Questions about these terms? Contact us at{" "}
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
