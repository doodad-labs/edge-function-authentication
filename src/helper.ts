import { Env } from "./types";
import { PrismaClient } from "./generated/prisma/";

import { RequestHandler } from 'itty-router'
import { PrismaD1 } from "@prisma/adapter-d1";

export const withDatabase: RequestHandler = async (_, env: Env) => {
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });

    env.PRISMA = prisma;
}