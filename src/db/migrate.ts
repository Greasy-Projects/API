import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, connection } from "./config";
migrate(db, { migrationsFolder: "./src/db/migrations" }).then(() => {
	connection.end();
});
