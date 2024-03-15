import { g } from "garph";

const dateType = g.scalarType<Date, number>("Date", {
	serialize: value => value.getTime(),
	parseValue: value => new Date(value),
});

const ResponseType = g.type("Response", {
	status: g.int(),
	message: g.string(),
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
	content: g.string().args({
		path: g.string(),
	}),
	me: g.ref(UserType).description("Get logged in user."),
});

export const mutationType = g.type("Mutation", {
	invalidateContent: g.ref(ResponseType).args({ path: g.string() }),
	tempContent: g
		.ref(ResponseType)
		.args({ path: g.string(), content: g.string() }),
	setContent: g
		.ref(ResponseType)
		.args({ path: g.string(), content: g.string() }),
});
export { g };
