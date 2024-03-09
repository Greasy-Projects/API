import { db, schema } from "../../db";
import { eq } from "drizzle-orm";
import { verifyAuth } from "../../auth";
import { type Resolvers } from "./";

const meResolver: Resolvers["Query"] = {
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
};
export default meResolver;
