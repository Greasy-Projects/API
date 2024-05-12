import env from "~/env";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./src/db/migrations",
	dialect: "mysql",
	dbCredentials: {
		host: env.DB_HOST,
		user: env.DB_USER,
		password: env.DB_PASS,
		database: env.DB_NAME,
	},
});
