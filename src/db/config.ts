import "dotenv/config";
import * as mysql from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";

export const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "greasy",
  multipleStatements: true,
});
export const db = drizzle(connection);

// migrate(db, { migrationsFolder: "./server/db/migrations" });
