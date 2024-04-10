import "dotenv/config";
import express from "express";
import fs from "fs";

import cookieParser from "cookie-parser";
import helmet from "helmet";
import { createYoga } from "graphql-yoga";
import { CronJob } from "cron";
import { lte } from "drizzle-orm";

import { schema as gql } from "./gql";
import { db, schema } from "./db";
import { slowDownLimiter, rateLimiterMiddleware } from "./ratelimit";

const app = express();

app.use(cookieParser());
app.use(slowDownLimiter);
app.use(rateLimiterMiddleware);

const yoga = createYoga({ schema: gql });
const yogaRouter = express.Router();

function checkEnvVars(envVars: string[]): void {
	const undefinedVars: string[] = [];
	envVars.forEach(envVar => {
		if (!process.env[envVar] || process.env[envVar]?.trim() === "") {
			undefinedVars.push(envVar);
		}
	});

	if (undefinedVars.length > 0) {
		throw new Error(
			`Missing environment variables: ${undefinedVars.join(", ")}`
		);
	}
}

try {
	checkEnvVars([
		"DB_HOST",
		"DB_USER",
		"DB_PASS",
		"DB_NAME",
		"JWT_SECRET",
		"CALLBACK_URL",
		"BASE_URL",
		"GITHUB_TOKEN",
		"GITHUB_OWNER",
		"GITHUB_REPO",
		"TWITCH_CLIENT_ID",
		"TWITCH_CLIENT_SECRET",
		"DISCORD_CLIENT_ID",
		"DISCORD_CLIENT_SECRET",
	]);
} catch (error) {
	console.error(error);
	process.exit(1);
}

yogaRouter.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				"style-src": ["'self'", "unpkg.com"],
				"script-src": ["'self'", "unpkg.com", "'unsafe-inline'"],
				"img-src": ["'self'", "raw.githubusercontent.com"],
			},
		},
	})
);

yogaRouter.use(yoga);
app.use(yoga.graphqlEndpoint, yogaRouter);
// Add the global CSP configuration for the rest of your server.
// app.use(helmet());

fs.readdirSync("./src/routes").forEach(async file => {
	if (file.endsWith(".ts")) {
		const route = await import(`./routes/${file}`);
		app.use(route.default);
		console.log(`Loaded routes/${file}`);
	}
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
	console.log(`Running at ${process.env.BASE_URL}`);
});

async function removeExpiredSessions() {
	try {
		await db
			.delete(schema.sessions)
			.where(lte(schema.sessions.expiresAt, new Date()));
	} catch (error) {
		console.error("Error removing expired sessions:", error);
	}
}

// At 00:00 on Sunday
new CronJob("0 0 * * 0", removeExpiredSessions).start();
