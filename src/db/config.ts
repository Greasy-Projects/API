import env from "~/env";
import "dotenv/config";
import * as mysql from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";

export const connection = mysql.createConnection({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASS,
	database: env.DB_NAME,
	multipleStatements: true,
});
export const db = drizzle(connection);

// migrate(db, { migrationsFolder: "./server/db/migrations" });
