export function SEOContent() {
  return (
    <section
      aria-label="About Jukebox"
      className="mx-auto max-w-3xl space-y-12 px-6 py-16 text-muted-foreground"
      style={{ marginTop: "var(--space-2xl)" }}
    >
      <div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">
          Music, the Way It Was Meant to Be Heard
        </h2>
        <p>
          Jukebox is a free listening app for people who actually care about
          music. Join a live Jukebox and hear the same music at the same time
          as everyone else in the room — deep cuts, rare tracks, sample
          breakdowns — while talking about it in a live chat. Official
          Jukeboxes are curated by the Jukebox team around specific themes. Or
          become a DJ — create your own Jukebox, build a tracklist, and host a
          live listening session for others to join.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">How It Works</h2>
        <ol className="list-inside list-decimal space-y-3">
          <li>
            <strong>Join a Jukebox</strong> — Browse live rooms. Official
            Jukeboxes are always running with curated tracklists. User-hosted
            Jukeboxes go live when a DJ starts a session.
          </li>
          <li>
            <strong>Listen together</strong> — Everyone in the room hears the
            same track at the same moment. React, discuss, and share the
            experience in the live chat.
          </li>
          <li>
            <strong>Become a DJ</strong> — Create your own Jukebox, name it,
            build a tracklist, and go live. You can even let listeners submit
            songs by dropping YouTube or SoundCloud links.
          </li>
        </ol>
      </div>

      <div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">
          Frequently Asked Questions
        </h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-semibold text-foreground">Is Jukebox free?</dt>
            <dd>
              Yes. Completely free. No subscriptions, no ads, no credit card.
              Just music.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Do I need an account?</dt>
            <dd>
              Not to listen. Jump into any live Jukebox without signing up.
              Create a free account to DJ your own room or save your favorites.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">
              What are Official Jukeboxes?
            </dt>
            <dd>
              Official Jukeboxes are curated by the Jukebox team around
              specific themes — like old school hip-hop deep cuts or
              sample-original pairings. They loop a hand-picked tracklist and
              stay live until the team rotates them out, usually monthly.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">
              Can I DJ my own Jukebox?
            </dt>
            <dd>
              Yes. Sign up, build a tracklist, and go live. You control what
              plays. If you want, you can let listeners suggest songs by
              pasting YouTube or SoundCloud links. Your Jukebox stays live as
              long as you're hosting.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">
              How is this different from Spotify or Apple Music?
            </dt>
            <dd>
              Spotify gives you a playlist you listen to alone. Jukebox gives
              you a room — everyone hears the same music at the same time and
              talks about it in a live chat. It's a shared experience, not a
              solo one.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Can I request songs?</dt>
            <dd>
              In user-created Jukeboxes, DJs can allow listeners to submit song
              suggestions via YouTube or SoundCloud links. Official Jukeboxes
              have locked tracklists curated by the Jukebox team.
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
            "Yes. Completely free. No subscriptions, no ads, no credit card. Just music.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need an account?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Not to listen. Jump into any live Jukebox without signing up. Create a free account to DJ your own room or save your favorites.",
        },
      },
      {
        "@type": "Question",
        name: "What are Official Jukeboxes?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Official Jukeboxes are curated by the Jukebox team around specific themes — like old school hip-hop deep cuts or sample-original pairings. They loop a hand-picked tracklist and stay live until the team rotates them out, usually monthly.",
        },
      },
      {
        "@type": "Question",
        name: "Can I DJ my own Jukebox?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Sign up, build a tracklist, and go live. You control what plays. If you want, you can let listeners suggest songs by pasting YouTube or SoundCloud links. Your Jukebox stays live as long as you're hosting.",
        },
      },
      {
        "@type": "Question",
        name: "How is this different from Spotify or Apple Music?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Spotify gives you a playlist you listen to alone. Jukebox gives you a room — everyone hears the same music at the same time and talks about it in a live chat. It's a shared experience, not a solo one.",
        },
      },
      {
        "@type": "Question",
        name: "Can I request songs?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "In user-created Jukeboxes, DJs can allow listeners to submit song suggestions via YouTube or SoundCloud links. Official Jukeboxes have locked tracklists curated by the Jukebox team.",
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
      "A free listening app for music heads. Curated official Jukeboxes and user-hosted DJ sessions with synced listening and live chat. Deep cuts, rare tracks, sample breakdowns.",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Synced listening rooms",
      "Live chat",
      "Curated official Jukeboxes",
      "DJ your own Jukebox",
      "Listener song submissions via YouTube and SoundCloud",
      "No account required to listen",
    ],
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
