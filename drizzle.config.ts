import env from "~/env";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./src/db/migrations",
	driver: "mysql2",
	dbCredentials: {
		host: env.DB_HOST,
		user: env.DB_USER,
		password: env.DB_PASS,
		database: env.DB_NAME,
	},
});
