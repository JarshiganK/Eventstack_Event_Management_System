export default async function notificationRoutes(app) {
    // Placeholder notifications route - returns empty list for a user.
    app.get('/notifications/user/:userId', async (request, reply) => {
        const { userId } = request.params;
        // TODO: implement real DB-backed notifications. Returning empty list for now.
        return reply.send({ userId, notifications: [] });
    });
}
