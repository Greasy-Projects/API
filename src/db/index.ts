export * as schema from "./schema";
export { db, connection } from "./config";
export const secret = new TextEncoder().encode(process.env.JWT_SECRET);
