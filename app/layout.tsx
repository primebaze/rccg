import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "RCCG Member Birthdays",
  description: "Member onboarding and automatic birthday messages for RCCG."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
