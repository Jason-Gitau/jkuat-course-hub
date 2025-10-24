import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { UserProvider } from "@/lib/providers/UserProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ServiceWorkerInit from "@/components/ServiceWorkerInit";
import InstallPrompt from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "JKUAT Course Hub",
  description: "Student-driven platform for organizing course materials and AI-powered tutoring",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JKUAT Hub",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <UserProvider>
            <ServiceWorkerInit />
            <Navigation />
            {children}
            <InstallPrompt />
          </UserProvider>
        </QueryProvider>
        {process.env.VERCEL === '1' && <SpeedInsights />}
      </body>
    </html>
  );
}
