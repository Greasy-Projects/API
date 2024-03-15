import { verifyAuth } from "../../auth";
import { type Resolvers } from "./";

const meResolver: Resolvers["Query"] = {
	me: async (_, __, { request }) => {
		const { user, account } = await verifyAuth(request);

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
