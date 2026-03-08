import type { Metadata, Viewport } from "next";
import { Literata } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "This Day That Year — Today in History",
    template: "%s",
  },
  description:
    "Discover what happened on this day throughout history. A new historical event every day with immersive visuals.",
  applicationName: "This Day That Year",
  metadataBase: new URL("https://tdty.vercel.app"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050403",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={literata.className}>
      <head>
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
        <link rel="preconnect" href="https://upload.wikimedia.org" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
