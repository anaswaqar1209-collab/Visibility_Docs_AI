import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Visibility Docs AI",
    description:
        "Enterprise Document Intelligence Platform — Visibility Bots. Upload, understand, search, and chat with your documents.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-theme="dark" suppressHydrationWarning>
            <body className="antialiased" suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
