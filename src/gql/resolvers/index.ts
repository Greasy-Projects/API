import { mutationType, queryType } from "../schema";
import { contentQuery, contentMutation } from "./content";
import { whitelistQuery, whitelistMutation } from "./whitelist";
// import watchtime from "./watchtime";
import getTwitchUser from "./getTwitchUser";

import me from "./me";
import { InferResolvers } from "garph";
import { YogaInitialContext } from "graphql-yoga";
export type Resolvers = InferResolvers<
	{ Query: typeof queryType; Mutation: typeof mutationType },
	{ context: YogaInitialContext }
>;

export const resolvers = {
	Query: {
		...contentQuery,
		...me,
		// ...watchtime,
		...getTwitchUser,
		...whitelistQuery,
	},

	Mutation: {
		...contentMutation,
		...whitelistMutation,
	},
};
