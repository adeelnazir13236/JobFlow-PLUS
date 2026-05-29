import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), "backend", ".env");

if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = (match[2] || "").replace(/^["']|["']$/g, "");
  }
}

export default {
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations"
  },
  datasource: {
    url: process.env.DATABASE_URL || "mysql://USER:PASSWORD@localhost:3306/jobflow"
  }
};
