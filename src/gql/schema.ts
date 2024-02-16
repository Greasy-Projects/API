import { GarphSchema } from "garph";

export const g = new GarphSchema();

const dateType = g.scalarType<Date, number>("Date", {
  serialize: (value) => value.getTime(),
  parseValue: (value) => new Date(value),
});

const UserType = g.type("User", {
  userId: g.id(),
  accountId: g.id(),
  platform: g.string(),
  displayName: g.string(),
  avatar: g.string().optional(),
  email: g.string().optional(),
  scope: g.string(),
  createdAt: dateType,
  updatedAt: dateType,
});

export const queryType = g.type("Query", {
  hello: g.string().description("Hello World"),
  me: g.ref(UserType).description("Get logged in user."),
});

export const mutationType = g.type("Mutation", {});
