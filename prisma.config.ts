import path from "node:path";
import { defineConfig } from "prisma/config";

try {
  await import("dotenv/config");
} catch {
  // dotenv not available (e.g. Vercel build), env vars provided by platform
}

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
});
