import { InferResolvers } from "garph";
import { YogaInitialContext } from "graphql-yoga";

import {  queryType } from "./schema";
import { db, schema } from "../db";

import {  eq } from "drizzle-orm";
import { verifyAuth } from "../auth";

type Resolvers = InferResolvers<
  { Query: typeof queryType },
  { context: YogaInitialContext }
>;

export const resolvers: Resolvers = {
  Query: {
    hello: () => "Hello World!",
    me: async (_, __, { request }) => {
      let data = await verifyAuth(request);

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
