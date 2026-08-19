import type { Metadata } from "next";
import "@/app/globals.css";

const title = "RCCG Worship Tabernacle — Member Registration";
const description = "Complete your member profile so we can keep your record current and stay in touch.";

export const metadata: Metadata = {
  // Lets Next.js turn the generated opengraph-image route into the absolute URL
  // that link previews (WhatsApp, Facebook, X, LinkedIn) require.
  metadataBase: new URL("https://member.rccgwt.co.uk"),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "RCCG Worship Tabernacle",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title,
    description
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
