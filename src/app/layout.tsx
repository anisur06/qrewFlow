import type { Metadata } from "next";
import "./globals.css";

const repositoryName =
  process.env.GITHUB_ACTIONS === "true"
    ? process.env.GITHUB_REPOSITORY?.split("/")[1]
    : undefined;
const basePath =
  repositoryName && !repositoryName.endsWith(".github.io")
    ? `/${repositoryName}`
    : "";

export const metadata: Metadata = {
  title: "QrewFlow | Workflow Studio",
  description: "Design, validate, and publish workflows with QrewFlow.",
  icons: { icon: `${basePath}/icon.svg` },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="light" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
