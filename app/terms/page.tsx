import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Jukebox terms of service.",
  alternates: { canonical: "https://jukebox-app.com/terms" },
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <h1 className="font-sans text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
      <p className="font-sans text-sm text-muted-foreground mb-10">Last updated: March 19, 2026</p>

      <div className="space-y-8 font-sans text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Jukebox ("the Service"), operated by Jukebox ("we", "us", "our"),
            you agree to be bound by these Terms of Service. If you do not agree to these terms,
            do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
          <p>
            Jukebox is a social music streaming platform that allows users to create and join
            live listening rooms, chat with other listeners, queue tracks, and interact with DJs
            in real time. Some features may require a paid subscription or in-app purchases.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. Account Registration</h2>
          <p>
            To use certain features, you must create an account with a valid email address.
            You are responsible for maintaining the confidentiality of your account credentials
            and for all activity under your account. You must be at least 13 years old to create
            an account. You agree to provide accurate information and to keep it up to date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. User Conduct</h2>
          <p className="mb-2">You agree not to:</p>
          <p>
            Use the Service for any unlawful purpose; harass, abuse, or threaten other users;
            impersonate any person or entity; upload or share content that infringes on intellectual
            property rights; attempt to gain unauthorized access to the Service or its systems;
            use bots, scrapers, or automated tools to interact with the Service; interfere with
            or disrupt the Service or its infrastructure; or share explicit, hateful, or harmful
            content in chat rooms or profiles.
          </p>
          <p className="mt-2">
            We reserve the right to suspend or terminate accounts that violate these rules
            without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Content and Music</h2>
          <p>
            Jukebox facilitates the sharing and playback of music through third-party sources
            such as YouTube and SoundCloud. We do not host or store copyrighted music files.
            Users are responsible for ensuring they have the right to share any content they
            submit. DJs and room creators are responsible for the content played in their rooms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">6. Paid Features</h2>
          <p>
            Jukebox offers optional paid features including Jukebox Plus subscriptions and Neon
            virtual currency purchases. All purchases are processed through Stripe, our
            third-party payment processor. Subscriptions renew automatically unless cancelled.
            Neon currency is non-refundable and has no cash value. We reserve the right to
            modify pricing at any time with reasonable notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Intellectual Property</h2>
          <p>
            The Jukebox name, logo, and all original content, features, and functionality of
            the Service are owned by Jukebox and are protected by copyright, trademark, and
            other intellectual property laws. You may not copy, modify, distribute, or create
            derivative works from any part of the Service without our express written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Disclaimers</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind,
            whether express or implied. We do not guarantee that the Service will be uninterrupted,
            secure, or error-free. We are not responsible for any content shared by users or
            third-party services linked through the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Jukebox shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the
            Service, including loss of data, revenue, or profits, even if we have been advised
            of the possibility of such damages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">10. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time, for any reason,
            without notice. Upon termination, your right to use the Service ceases immediately.
            Provisions that by their nature should survive termination will remain in effect.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">11. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. When we do, we will revise the "Last
            updated" date at the top. Continued use of the Service after changes constitutes
            acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">12. Contact</h2>
          <p>
            If you have questions about these Terms, please visit our{" "}
            <Link href="/support" className="text-foreground underline hover:text-primary transition-colors">
              Support page
            </Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
