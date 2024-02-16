import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, connection } from "./config";
migrate(db, { migrationsFolder: "drizzle/migrations" }).then(() => {
  connection.end();
});
