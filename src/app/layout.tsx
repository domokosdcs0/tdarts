import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "tDarts",
  description: "Your ultimate darts tournament management system",
  icons: {
    icon: "/tbase_fav.svg",
    apple: "/tbase_fav.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <head>
      <meta name="color-scheme" content="only light"></meta>
      </head>
      <body data-theme="emerald"
        className='bg-base-100 text-base-content min-h-screen flex flex-col items-center gap-2 justify-center p-4'
      >
        <Toaster position="top-left"/>
         {/* Header */}
      <div className="navbar bg-base-100 shadow-md justify-evenly">
        <Link href={'/'} className=" btn btn-ghost p-2">
          <Image
            src={"/tbase_fav.svg"}
            width={40}
            height={40}
            alt="tDarts Logo"
          />
          <h1 className="text-4xl font-bold">tDarts</h1>
        </Link>
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
          <input type="checkbox" value="neonbird" className="toggle theme-controller" />
        </div>
      </div>
        {children}
      </body>
    </html>
  );
}
