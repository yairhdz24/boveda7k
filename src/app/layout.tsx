import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/manrope";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "./tokens.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Bóveda",
  description: "Credenciales de cada cliente, en un solo lugar y cifradas.",
  robots: { index: false, follow: false },
  applicationName: "Bóveda",
  appleWebApp: { capable: true, title: "Bóveda", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
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
