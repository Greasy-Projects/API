import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, connection } from "./config";
await migrate(db, { migrationsFolder: "drizzle/migrations" });
connection.end();
