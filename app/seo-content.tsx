export function SEOContent() {
  return (
    <section
      aria-label="About Jukebox"
      className="mx-auto max-w-3xl space-y-12 px-6 py-16 text-muted-foreground"
      style={{ marginTop: "var(--space-2xl)" }}
    >
      <div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">What is Jukebox?</h2>
        <p>
          Jukebox is a free social music app where you join live listening rooms organized by
          genre — Hip-Hop, Lo-fi, Jazz, Electronic, Indie, and Soul. Instead of listening alone,
          you share the experience with other music lovers in real time. No downloads, no
          subscriptions, just pick a room and press play.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">How It Works</h2>
        <ol className="list-inside list-decimal space-y-3">
          <li>
            <strong>Pick a genre</strong> — Choose from Hip-Hop, Lo-fi, Jazz, Electronic, Indie,
            or Soul.
          </li>
          <li>
            <strong>Join a live room</strong> — Jump into an active room with other listeners, or
            start your own.
          </li>
          <li>
            <strong>Listen together</strong> — Everyone hears the same music at the same time.
            Chat, react, discover.
          </li>
        </ol>
      </div>

      <div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-semibold text-foreground">Is Jukebox free?</dt>
            <dd>
              Yes. Jukebox is completely free to use. Join any room, listen as long as you want,
              no credit card required.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Do I need an account?</dt>
            <dd>
              No. You can jump into any room without creating an account. Sign up if you want to
              save favorites, create rooms, or customize your DJ profile.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">What genres are available?</dt>
            <dd>
              We currently have six genre rooms: Hip-Hop, Lo-fi, Jazz, Electronic, Indie, and
              Soul. Users can also create custom rooms.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">How does real-time listening work?</dt>
            <dd>
              When a DJ plays a track, every listener in the room hears it simultaneously. The
              music syncs in real time over the web — no special software or plugins needed.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Can I create my own room?</dt>
            <dd>
              Yes. Sign up for a free account and you can create your own listening room with any
              theme or genre you want.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export function HomeStructuredData() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Jukebox free?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Jukebox is completely free to use. Join any room, listen as long as you want, no credit card required.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need an account?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "No. You can jump into any room without creating an account. Sign up to save favorites, create rooms, or customize your DJ profile.",
        },
      },
      {
        "@type": "Question",
        name: "What genres are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Six genre rooms: Hip-Hop, Lo-fi, Jazz, Electronic, Indie, and Soul. Users can also create custom rooms.",
        },
      },
      {
        "@type": "Question",
        name: "How does real-time listening work?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "When a DJ plays a track, every listener in the room hears it simultaneously. The music syncs in real time over the web.",
        },
      },
    ],
  }

  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Jukebox",
    url: "https://jukebox-app.com",
    description:
      "A free social music listening app with live genre rooms. Listen together in real time.",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }}
      />
    </>
  )
}
