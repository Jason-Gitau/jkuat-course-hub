import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { UserProvider } from "@/lib/providers/UserProvider";

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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <UserProvider>
            <Navigation />
            {children}
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
