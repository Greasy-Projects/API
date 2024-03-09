import { db, schema } from "../../db";
import { eq } from "drizzle-orm";
import { verifyAuth } from "../../auth";
import { type Resolvers } from "./";
import { UserType } from "../../db/schema";

const meResolver: Resolvers["Query"] = {
  me: async (_, __, { request }) => {
    let { user, account } = await verifyAuth(request, UserType.User);

    return {
      userId: user.id!,
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
