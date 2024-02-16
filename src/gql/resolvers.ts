import { InferResolvers } from "garph";
import { YogaInitialContext } from "graphql-yoga";

import { queryType, mutationType } from "./schema";
import { db, schema } from "../db";

import { eq } from "drizzle-orm";
import { verifyAuth } from "../auth";

type Resolvers = InferResolvers<
  { Query: typeof queryType; Mutation: typeof mutationType },
  { context: YogaInitialContext }
>;

export const resolvers: Resolvers = {
  Query: {
    hello: () => "Hello World!",
    me: async (_, __, { request }) => {
      let data = await verifyAuth(request);

      const [user] = await db
        .selectDistinct()
        .from(schema.users)
        .where(eq(schema.users.id, data.u));
      const [account] = await db
        .selectDistinct()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, user.primaryAccountId));
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
  Mutation: {
    
  },
};
