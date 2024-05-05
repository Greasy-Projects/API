import env from "~/env";
import express from "express";
import fs from "fs";

import cookieParser from "cookie-parser";
import helmet from "helmet";
import { createYoga } from "graphql-yoga";
import { CronJob } from "cron";
import { lte } from "drizzle-orm";

import { schema as gql } from "./gql";
import { db, schema } from "./db";
import watchtime from "./watchtime";
// IN TESTING
setInterval(watchtime, 150000);
watchtime();
const app = express();

app.use(cookieParser());

const yoga = createYoga({ schema: gql });
const yogaRouter = express.Router();

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

app.listen(env.PORT, () => {
	console.log(`Running at http://localhost:${env.PORT}`);
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
