import type { PrismaClient } from "./generated/prisma";

export interface Env {
    DB: D1Database;
    PRISMA: PrismaClient;
}