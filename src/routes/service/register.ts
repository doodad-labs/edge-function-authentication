import { IRequestStrict } from 'itty-router'
import { Env } from '../../types'
import argon2 from 'argon2'

type IRequest = IRequestStrict & {
    content: {
        [key: string]: any;
    };
}

export default async function (request: IRequest, env: Env) {

    const email = request.content.email;
    const password = request.content.password;

    if (!email || !password) {
        return {
            status: 400,
            error: `Missing required fields: ${
                [!email && 'email', !password && 'password'].filter(Boolean).join(', ')
            }`,
        }
    }

    // Check if the service user already exists
    const existingUser = await env.PRISMA.serviceUser.findUnique({
        where: { email },
    }).catch((error) => {
        console.error('Error checking for existing user:', error);
        return 'error'
    })

    // If the user exists, return a conflict status or if an error occurred
    if (existingUser) {
        
        if (existingUser === 'error') {
            return {
                status: 500,
                error: 'Internal server error while checking for existing user',
            }
        }
        
        return {
            status: 409,
            error: 'Service user already exists with this email address',
        }
    }

    // Create the new service user
    const newUser = await env.PRISMA.serviceUser.create({
        data: {
            email,
            password: await argon2.hash(password),
        }
    })

    return {
        status: 200,
        message: existingUser
    }
}