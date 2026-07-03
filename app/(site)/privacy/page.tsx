import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Jukebox privacy policy.",
  alternates: { canonical: "https://jukebox-app.com/privacy" },
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <h1 className="font-sans text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="font-sans text-sm text-muted-foreground mb-10">Last updated: April 10, 2026</p>

      <div className="space-y-8 font-sans text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Introduction</h2>
          <p>
            Jukebox ("we", "us", "our") is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when
            you use our platform at jukebox-app.com and related services (collectively, "the Service").
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Information We Collect</h2>
          <p className="font-semibold text-foreground mb-2">Information you provide:</p>
          <p className="mb-3">
            Account information such as your email address, display name, and stage name when
            you register; profile information you choose to add; chat messages sent in rooms;
            payment information processed through Stripe (we do not store your card details);
            and any communications you send to our support team.
          </p>
          <p className="font-semibold text-foreground mb-2">Information collected automatically:</p>
          <p>
            Usage data such as rooms visited, listening history, and features used; device
            information including browser type, operating system, and screen resolution; IP
            address and approximate location derived from it; and cookies and similar
            technologies for session management and authentication.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
          <p>
            We use the information we collect to provide and maintain the Service; authenticate
            your identity and manage your account; process payments and subscriptions through
            Stripe; send transactional emails such as verification and password reset messages;
            personalize your experience and display relevant content; monitor and improve the
            performance, security, and reliability of the Service; enforce our Terms of Service
            and protect against misuse; and comply with legal obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. How We Share Your Information</h2>
          <p className="mb-2">We do not sell your personal information. We may share information with:</p>
          <p>
            Service providers who assist us in operating the platform, including Stripe for
            payment processing, Resend for email delivery, Vercel for frontend hosting, and
            Render for backend infrastructure. These providers only receive the information
            necessary to perform their services. We may also share information if required by
            law, to protect our rights, or in connection with a business transfer such as a
            merger or acquisition.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Third-Party Music Services (YouTube and SoundCloud)</h2>
          <p className="font-semibold text-foreground mb-2">YouTube:</p>
          <p className="mb-3">
            Jukebox uses YouTube embedded players to play YouTube-hosted tracks. By using
            Jukebox, you acknowledge and agree to be bound by the{" "}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:text-primary transition-colors"
            >
              YouTube Terms of Service
            </a>
            . Information collected by the embedded YouTube player is governed by the{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:text-primary transition-colors"
            >
              Google Privacy Policy
            </a>
            . YouTube and Google may collect information such as your IP address, device
            identifiers, browser characteristics, viewing activity, and cookies in order to
            deliver and measure the embedded player. This data is collected directly by Google
            and is not under Jukebox's control. You can manage data Google has associated with
            your account at{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:text-primary transition-colors"
            >
              myaccount.google.com/permissions
            </a>
            .
          </p>
          <p className="font-semibold text-foreground mb-2">SoundCloud:</p>
          <p>
            Jukebox uses the SoundCloud Widget API to play SoundCloud-hosted tracks. When a
            SoundCloud track is loaded, your browser communicates directly with SoundCloud and
            SoundCloud may collect information such as your IP address, device characteristics,
            and playback events under their own policies. This data is collected directly by
            SoundCloud and is not under Jukebox's control. SoundCloud's data practices are
            described in the{" "}
            <a
              href="https://soundcloud.com/pages/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:text-primary transition-colors"
            >
              SoundCloud Privacy Policy
            </a>
            , and use of SoundCloud's services is governed by the{" "}
            <a
              href="https://soundcloud.com/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:text-primary transition-colors"
            >
              SoundCloud Terms of Use
            </a>
            . Jukebox does not store SoundCloud audio on our servers; we only store the track
            URL, title, and artist metadata necessary to embed the player.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">6. Public Information</h2>
          <p>
            Certain information is visible to other users by design, including your display name,
            stage name, and profile avatar; your activity in rooms such as chat messages, reactions,
            and Neon gifts; rooms you create as a DJ and their associated metadata; and playlists
            you choose to make public. Chat messages sent in rooms are visible to all participants
            in that room in real time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Data Retention</h2>
          <p>
            We retain your account information for as long as your account is active. Chat messages
            are retained for the duration of a room session and may be stored for a limited period
            for moderation purposes. If you delete your account, we will remove your personal
            information within 30 days, except where we are required to retain it by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your
            information, including encryption in transit via HTTPS/TLS, secure password hashing
            using bcrypt, JWT-based authentication with short-lived tokens, and database access
            restricted to internal services. However, no method of electronic transmission or
            storage is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. These are strictly
            necessary for the Service to function and cannot be disabled. We do not use advertising
            or tracking cookies, and we do not serve ads on Jukebox. Note that the embedded YouTube
            and SoundCloud players may set their own cookies and similar storage when you play a
            track from those platforms; those cookies are controlled by Google and SoundCloud
            respectively under their own privacy policies (see Section 5).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">10. Your Rights</h2>
          <p>
            Depending on your location, you may have the right to access the personal information
            we hold about you; request correction of inaccurate information; request deletion of
            your account and associated data; object to or restrict certain processing of your
            data; and request a portable copy of your data. To exercise any of these rights,
            please contact us through our Support page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">11. Children's Privacy</h2>
          <p>
            The Service is not intended for children under 13 years of age. We do not knowingly
            collect personal information from children under 13. If we become aware that a child
            under 13 has provided us with personal information, we will take steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the
            "Last updated" date at the top of this page. We encourage you to review this page
            periodically.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">13. Contact</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights,
            please visit our{" "}
            <Link href="/support" className="text-foreground underline hover:text-primary transition-colors">
              Support page
            </Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
