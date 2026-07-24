import type { Metadata } from "next";
import { getSiteOrigin } from "@/lib/site-url";
import "./globals.css";
import "./redesign.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "PlaceLink",
    template: "%s | PlaceLink",
  },
  description: "Real date courses made by real couples",
  applicationName: "PlaceLink",
  openGraph: {
    type: "website",
    siteName: "PlaceLink",
    title: "PlaceLink",
    description: "Real date courses made by real couples",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaceLink",
    description: "Real date courses made by real couples",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
