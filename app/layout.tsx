import type { Metadata } from "next";
import "@/app/globals.css";

const title = "RCCG Worship Tabernacle — Member Registration";
const description = "Complete your member profile so we can keep your record current and stay in touch.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "RCCG Worship Tabernacle",
    type: "website"
  },
  twitter: {
    card: "summary",
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
