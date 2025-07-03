import { IRequestStrict } from 'itty-router'
import { Env } from '../types'

export default async function (request: IRequestStrict, env: Env) {
    const users = await env.PRISMA.user.findMany().catch((error) => {
        console.error('Error fetching users:', error)
        return []
    })

    return {
        status: 200,
        users
    }
}