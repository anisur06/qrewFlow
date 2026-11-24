import type { NextConfig } from "next";

const repositoryName =
  process.env.GITHUB_ACTIONS === "true"
    ? process.env.GITHUB_REPOSITORY?.split("/")[1]
    : undefined;
const basePath =
  repositoryName && !repositoryName.endsWith(".github.io")
    ? `/${repositoryName}`
    : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(basePath ? { basePath } : {}),
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
