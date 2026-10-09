import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/manrope";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./tokens.css";
import "./app.css";
import "./tailwind.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Bóveda", template: "%s · Bóveda" },
  description: SITE_DESCRIPTION,
  // Todo es privado por defecto; /login se abre a buscadores en su propio layout.
  robots: { index: false, follow: false },
  applicationName: "Bóveda",
  appleWebApp: { capable: true, title: "Bóveda", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Bóveda",
    title: "Bóveda",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Bóveda", description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070908" },
    { media: "(prefers-color-scheme: light)", color: "#f3f6f4" },
  ],
};

const themeScript = `try{var t=localStorage.getItem('bv-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
