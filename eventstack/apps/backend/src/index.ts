// Get environment variables and server setup
import { env } from "./env.js";
import { buildServer } from "./server.js";

// Main function that starts the server
async function main() {
  const app = await buildServer();
  try {
    // Start listening on the port from environment variables
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    // If something goes wrong, log the error and exit
    app.log.error(err);
    process.exit(1);
  }
}

// Run the main function
main();


