import env from "~/env";
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export const connection = new Pool({
	host: env.DB_HOST,
	port: env.DB_PORT,
	user: env.DB_USER,
	password: env.DB_PASS,
	database: env.DB_NAME,
});
export const db = drizzle(connection);

// migrate(db, { migrationsFolder: "./server/db/migrations" });
