import { Env } from "./types";
import { PrismaClient } from "./generated/prisma/";

import { IRequestStrict } from 'itty-router'
import { PrismaD1 } from "@prisma/adapter-d1";

export function withDatabase(_: IRequestStrict, env: Env) {
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });

    env.PRISMA = prisma;
}