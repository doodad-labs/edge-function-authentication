import { IRequestStrict } from 'itty-router'
import locations from '../utils/colo.json'

export default async function (request: IRequestStrict) {

    /* const users = await env.PRISMA.user.findMany().catch((error) => {
        console.error('Error fetching users:', error)
        return []
    }) */

    const colo = request.cf?.colo as 'AAE';
    const location = locations[colo].name || 'Unknown';

    return {
        status: 200,
        edge: location,
    }
}