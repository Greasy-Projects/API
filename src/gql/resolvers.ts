import { InferResolvers } from "garph";
import { YogaInitialContext } from "graphql-yoga";

import { mutationType, queryType } from "./schema";
import { db, schema } from "../db";
import { user } from "../db/schema";
import { secret } from "../main";
import { validateJWT } from "oslo/jwt";
import { eq } from "drizzle-orm";

type Resolvers = InferResolvers<
  { Query: typeof queryType },
  { context: YogaInitialContext }
>;

export const resolvers: Resolvers = {
  Query: {
    hello: () => "Hello World!",
    me: async (_, __, { request }) => {
      let data = await protectedRoute(request);

      const [user] = await db
        .selectDistinct()
        .from(schema.user)
        .where(eq(schema.user.id, data.u));
      const [account] = await db
        .selectDistinct()
        .from(schema.account)
        .where(eq(schema.account.id, user.primaryAccountId));
      return {
        userId: user.id,
        accountId: account.id,
        platform: account.platform,
        displayName: account.displayName,
        scope: account.scope,
        email: account.email,
        avatar: account.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    },
  },
};

type payload = { u: string; a: string };
async function protectedRoute(request: Request): Promise<payload> {
  const header = request.headers.get("authorization");
  if (!header) {
    throw new Error("Missing Authorization header");
  }

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    throw new Error("Invalid Authorization header");
  const token = parts[1];

  //make sure the token is valid and has not been tampered with
  try {
    let jwt = await validateJWT("HS256", secret, token);
    let payload = jwt.payload as payload;

    if (!payload.a || !payload.u) throw new Error("Invalid token.");

    return payload;
  } catch (e) {
    throw new Error("Invalid token.");
  }
}
