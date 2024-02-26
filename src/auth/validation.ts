import { validateJWT } from "oslo/jwt";
import { schema, db } from "../db";
import { secret } from "../main";
import { and, eq } from "drizzle-orm";
import { GraphQLError } from "graphql";

type payload = { u: string; a: string };
export async function verifyAuth(request: Request | string) {
  let token: string;
  if (typeof request !== "string") {
    const header = request.headers.get("authorization");
    if (!header) {
      throw new GraphQLError("Missing Authorization header");
    }

    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      throw new GraphQLError("Invalid Authorization header");
    token = parts[1];
  } else token = request;

  let payload: payload;
  // Make sure the token is valid and has not been tampered with
  try {
    // This function will throw an error incase of; invalid signature, expired token or inactive token (`nbf`)
    // https://oslo.js.org/reference/jwt/validateJWT
    const jwt = await validateJWT("HS256", secret, token);
    payload = jwt.payload as payload;
  } catch (e) {
    throw new GraphQLError("Invalid token");
  }

  if (!payload.a || !payload.u) throw new GraphQLError("Invalid token payload");

  const [user] = await db
    .selectDistinct()
    .from(schema.users)
    .where(eq(schema.users.id, payload.u));
  if (!user) throw new GraphQLError("Invalid user");

  const [session] = await db
    .selectDistinct()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.userId, payload.u),
        eq(schema.sessions.token, token)
      )
    );

  if (!session) throw new GraphQLError("Invalid session");

  return { payload, user };
}
