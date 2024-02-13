import { InferResolvers } from "garph";
import { YogaInitialContext } from "graphql-yoga";

import { mutationType, queryType } from "./schema";
import { db } from "../db/config";
import { user } from "../db/schema";

type Resolvers = InferResolvers<
  { Query: typeof queryType },
  { context: YogaInitialContext }
>;

export const resolvers: Resolvers = {
  Query: {
    hello: () => "Hello World!",
  },
};
