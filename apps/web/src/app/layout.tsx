import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";

export const metadata: Metadata = {
  title: "place-link",
  description: "Real date courses made by real couples",
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
