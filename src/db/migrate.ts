import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, connection } from "./config";
migrate(db, { migrationsFolder: "./src/db/migrations" }).then(() => {
	connection.end();
});
