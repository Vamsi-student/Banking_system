import { configDotenv } from "dotenv";
configDotenv();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("FATAL: JWT_SECRET must be set and at least 32 characters long")
    process.exit(1)
}

if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    console.error("FATAL: JWT_REFRESH_SECRET must be set and at least 32 characters long")
    process.exit(1)
}

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import app from "./src/app.js";
import { connectdb } from "./src/config/db.js";

async function start() {
    try {
        /**
         * 1. Connect to database FIRST
         * Server will NOT accept requests until this succeeds.
         * If DB is unreachable, fail fast and crash immediately.
         */
        await connectdb()

        /**
         * 2. Only then start accepting HTTP requests
         * Every request that reaches a route handler has a working DB connection.
         */
        const server = app.listen(3000, () => {
            console.log("Server is running on port 3000")
        })

        /**
         * 3. Graceful shutdown
         * On SIGINT (Ctrl+C) or SIGTERM (process manager, Docker):
         *   - Stop accepting new connections
         *   - Wait for in-flight requests to complete
         *   - Disconnect from MongoDB
         *   - Exit
         */
        async function gracefulShutdown(signal) {
            console.log(`\n${signal} received. Shutting down gracefully...`)

            // Step 1: Stop accepting new connections.
            // Wait for all in-flight requests to finish before proceeding.
            await new Promise((resolve) => {
                server.close(() => {
                    console.log("HTTP server closed")
                    resolve()
                })
            })

            // Step 2: Close database connection.
            // This is safe now — no in-flight requests can need the DB.
            await mongoose.disconnect()
            console.log("Database disconnected")

            process.exit(0)
        }

        /**
         * Graceful shutdown with a forced exit timeout.
         * If graceful cleanup takes longer than 10 seconds, force exit.
         */
        const SHUTDOWN_TIMEOUT = 10 * 1000

        function setupSignalHandler(signal) {
            process.on(signal, () => {
                console.log(`\n${signal} received. Shutting down gracefully...`)

                const forceExit = setTimeout(() => {
                    console.error("Forced shutdown after timeout")
                    process.exit(1)
                }, SHUTDOWN_TIMEOUT)

                gracefulShutdown(signal).then(() => {
                    clearTimeout(forceExit)
                }).catch((error) => {
                    console.error("Shutdown failed:", error)
                    process.exit(1)
                })
            })
        }

        setupSignalHandler("SIGINT")
        setupSignalHandler("SIGTERM")

    } catch (error) {
        /**
         * If database connection fails or server fails to start:
         * Log the error and crash immediately.
         * A process manager (PM2, Docker, systemd) will restart the process.
         */
        console.error("Server failed to start:", error)
        process.exit(1)
    }
}

start()