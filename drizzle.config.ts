import env from "./src/env";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		host: env.DB_HOST,
		port: env.DB_PORT,
		user: env.DB_USER,
		password: env.DB_PASS,
		database: env.DB_NAME,
	},
});
