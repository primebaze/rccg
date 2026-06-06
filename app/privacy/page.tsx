import Link from "next/link";

const lastUpdated = "June 6, 2026";

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-panel">
        <Link className="legal-back" href="/">Back to registration</Link>
        <p className="legal-kicker">RCCG Worship Tabernacle</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {lastUpdated}</p>

        <section>
          <h2>What we collect</h2>
          <p>
            We collect the information you provide in the member profile form, including your name, contact details,
            date of birth, marital status, ordination status, address, ministry or department, occupation, and emergency
            contact details.
          </p>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>
            We use member information to maintain church records, communicate with members, support pastoral and
            administrative care, and send relevant member updates.
          </p>
        </section>

        <section>
          <h2>How we store and share it</h2>
          <p>
            Member records are stored in our database and may be accessed by authorized church administrators. We use
            trusted service providers to host the app, store records, and send emails or text messages. We do not sell
            member information.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            You may ask us to update, correct, or remove your member information. You may also ask us to stop sending
            non-essential communications.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy requests, contact the church office using the official contact details provided by RCCG Worship
            Tabernacle.
          </p>
        </section>

        <p className="legal-note">
          This page is a practical template for the webapp and should be reviewed by the church before public launch.
        </p>
      </article>
    </main>
  );
}
