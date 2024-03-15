import { mutationType, queryType } from "../schema";
import { contentQuery, contentMutation } from "./content";
import me from "./me";
import { InferResolvers } from "garph";
import { YogaInitialContext } from "graphql-yoga";
export type Resolvers = InferResolvers<
	{ Query: typeof queryType; Mutation: typeof mutationType },
	{ context: YogaInitialContext }
>;
import NodeCache from "node-cache";
export const cache = new NodeCache();

export const resolvers = {
	Query: {
		...contentQuery,
		...me,
	},

	Mutation: {
		...contentMutation,
	},
};
