import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DATABASE_HOST || "localhost";
  const port = process.env.DATABASE_PORT || "3306";
  const name = process.env.DATABASE_NAME || "daily81";
  const user = process.env.DATABASE_USER || "root";
  const password = process.env.DATABASE_PASSWORD || "";

  const encodedPassword = encodeURIComponent(password);
  const encodedUser = encodeURIComponent(user);

  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${name}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
