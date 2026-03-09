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
  metadataBase: new URL("https://thisyearthatday.vercel.app"),
  alternates: {
    canonical: "/",
  },
  verification: {
    other: {
      "msvalidate.01": "A1DF133464BFDC6FA8D3D52345D6A876",
    },
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

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "This Day That Year",
  alternateName: "TDTY",
  url: "https://thisyearthatday.vercel.app",
  description:
    "Discover what happened on this day throughout history. A new historical event every day with immersive visuals.",
  publisher: {
    "@type": "Organization",
    name: "This Day That Year",
    url: "https://thisyearthatday.vercel.app",
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
