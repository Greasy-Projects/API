import env from "~/env";
export * as schema from "./schema";
export * from "./schema";
export { db, connection } from "./config";
export const secret = new TextEncoder().encode(env.JWT_SECRET);
