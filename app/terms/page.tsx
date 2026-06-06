import Link from "next/link";

const lastUpdated = "June 6, 2026";

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <article className="legal-panel">
        <Link className="legal-back" href="/">Back to registration</Link>
        <p className="legal-kicker">RCCG Worship Tabernacle</p>
        <h1>Terms and Conditions</h1>
        <p className="legal-updated">Last updated: {lastUpdated}</p>

        <section>
          <h2>Use of this app</h2>
          <p>
            This app is provided to help RCCG Worship Tabernacle collect and maintain member profile information. Please
            submit accurate information and update the church office when your details change.
          </p>
        </section>

        <section>
          <h2>Member information</h2>
          <p>
            By submitting the form, you confirm that the information provided is your own or that you have permission to
            provide it. The church may use the information for member administration, communication, and care.
          </p>
        </section>

        <section>
          <h2>Communications</h2>
          <p>
            The church may contact you by email, phone, or text message for member-related updates and administrative
            purposes. You can ask the church office to update your communication preferences.
          </p>
        </section>

        <section>
          <h2>Availability</h2>
          <p>
            We aim to keep the app available and accurate, but access may be interrupted for maintenance, updates, or
            issues outside our control.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these terms should be directed to the RCCG Worship Tabernacle church office.
          </p>
        </section>

        <p className="legal-note">
          These terms are a practical template for the webapp and should be reviewed by the church before public launch.
        </p>
      </article>
    </main>
  );
}
