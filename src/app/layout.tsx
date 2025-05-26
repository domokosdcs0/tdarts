import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Link from "next/link";

export const metadata: Metadata = {
  title: "tDarts",
  description: "Your ultimate darts tournament management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <meta name="color-scheme" content="only light"></meta>
      </head>
      <body
        className='bg-base-100 text-base-content min-h-screen flex flex-col items-center gap-2 justify-center p-4'
      >
        <Toaster position="top-left"/>
         {/* Header */}
      <div className="navbar bg-base-100 shadow-md justify-evenly">
        <div className="">
          <h1 className="text-2xl font-bold pl-4">tDarts</h1>
        </div>
        <div className="">
          <Link href="/" className="btn btn-ghost normal-case text-md">
            Főoldal
          </Link>
          <Link href="/clubs" className="btn btn-ghost normal-case text-md">
            Klubbok
          </Link>
          <Link href="/tournaments" className="btn btn-ghost normal-case text-md">
            Tornák
          </Link>
          <input type="checkbox" value="emerald" className="toggle theme-controller" />
        </div>
      </div>
        {children}
      </body>
    </html>
  );
}
