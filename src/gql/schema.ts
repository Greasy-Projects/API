import { GarphSchema } from "garph";

export const g = new GarphSchema();

export const queryType = g.type("Query", {
  hello: g.string().description("Hello World"),
});

export const mutationType = g.type("Mutation", {});
