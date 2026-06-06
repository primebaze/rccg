"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  CalendarHeart,
  Check,
  Church,
  HeartHandshake,
  HomeIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound
} from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      dateOfBirth: formData.get("dateOfBirth"),
      maritalStatus: formData.get("maritalStatus"),
      isOrdained: formData.get("isOrdained") === "on",
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2"),
      city: formData.get("city"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country"),
      occupation: formData.get("occupation"),
      ministryDepartment: formData.get("ministryDepartment"),
      emergencyContactName: formData.get("emergencyContactName"),
      emergencyContactPhone: formData.get("emergencyContactPhone"),
      consentEmail: true,
      consentSms: true
    };

    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setStatus(response.ok ? "success" : "error");
    setMessage(result.message ?? "Something went wrong. Please try again.");

    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel">
        <div className="brand-mark" aria-label="RCCG">
          <CalendarHeart size={26} />
          <span>RCCG</span>
        </div>

        <div className="intro">
          <p>Member onboarding</p>
          <h1>Complete your member profile</h1>
          <span>
            Share your details so the church office can keep your member record current and stay in touch when needed.
          </span>
        </div>

        <form className="member-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label>
              <span><UserRound size={16} />First name</span>
              <input name="firstName" autoComplete="given-name" required />
            </label>
            <label>
              <span><UserRound size={16} />Last name</span>
              <input name="lastName" autoComplete="family-name" required />
            </label>
          </div>

          <label>
            <span><Mail size={16} />Email address</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label>
            <span><Phone size={16} />Mobile number</span>
            <input name="phone" type="tel" autoComplete="tel" placeholder="+31 6 1234 5678" required />
          </label>

          <label>
            <span><CalendarHeart size={16} />Date of birth</span>
            <input name="dateOfBirth" type="date" required />
          </label>

          <div className="field-grid">
            <label>
              <span><HeartHandshake size={16} />Marital status</span>
              <select name="maritalStatus" defaultValue="" required>
                <option value="" disabled>Select status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="divorced">Divorced</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>

            <label>
              <span><BriefcaseBusiness size={16} />Occupation</span>
              <input name="occupation" autoComplete="organization-title" />
            </label>
          </div>

          <div className="consent-box">
            <label className="check-line">
              <input name="isOrdained" type="checkbox" />
              <span>Ordained minister</span>
            </label>
          </div>

          <label>
            <span><HomeIcon size={16} />Address</span>
            <input name="addressLine1" autoComplete="address-line1" required />
          </label>

          <label>
            <span><HomeIcon size={16} />Address line 2</span>
            <input name="addressLine2" autoComplete="address-line2" />
          </label>

          <div className="field-grid three">
            <label>
              <span><MapPin size={16} />City</span>
              <input name="city" autoComplete="address-level2" required />
            </label>
            <label>
              <span><MapPin size={16} />Postcode</span>
              <input name="postalCode" autoComplete="postal-code" required />
            </label>
            <label>
              <span><MapPin size={16} />Country</span>
              <input name="country" autoComplete="country-name" defaultValue="Netherlands" required />
            </label>
          </div>

          <label>
            <span><Church size={16} />Ministry or department</span>
            <input name="ministryDepartment" placeholder="Choir, Ushering, Youth, Media..." />
          </label>

          <div className="field-grid">
            <label>
              <span><UserRound size={16} />Emergency contact</span>
              <input name="emergencyContactName" autoComplete="name" />
            </label>
            <label>
              <span><Phone size={16} />Emergency phone</span>
              <input name="emergencyContactPhone" type="tel" autoComplete="tel" />
            </label>
          </div>

          <button className="submit-button" disabled={status === "submitting"}>
            {status === "submitting" ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
            Complete registration
          </button>

          {message ? <p className={`form-message ${status}`}>{message}</p> : null}
        </form>
      </section>

      <aside className="care-panel" aria-label="Member record summary">
        <div className="care-card primary">
          <ShieldCheck size={24} />
          <h2>Secure member records</h2>
          <p>Your details help the church office care for members with accurate contact information.</p>
        </div>
        <div className="care-card">
          <Mail size={22} />
          <h2>Simple communication</h2>
          <p>Choose how the church may contact you for important member updates.</p>
        </div>
      </aside>
    </main>
  );
}
