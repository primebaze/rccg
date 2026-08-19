import type { Metadata } from "next";
import "@/app/globals.css";

const title = "RCCG Worship Tabernacle — Member Registration";
const description = "Complete your member profile so we can keep your record current and stay in touch.";

export const metadata: Metadata = {
  // Required so the relative OG image path below resolves to an absolute URL,
  // which link previews (WhatsApp, Facebook, X, LinkedIn) need.
  metadataBase: new URL("https://member.rccgwt.co.uk"),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "RCCG Worship Tabernacle",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RCCG Worship Tabernacle"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
