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
const TwitchUserType = g.type("TwitchUser", {
	id: g.id(),
	login: g.string(),
	display_name: g.string(),
	type: g.string(),
	broadcaster_type: g.string(),
	description: g.string(),
	profile_image_url: g.string(),
	view_count: g.int(),
	created_at: g.string(),
});

const WatchtimeType = g.type("Watchtime", {
	time: g.int(),
	displayName: g.string(),
	avatar: g.string().optional(),
});

export const queryType = g.type("Query", {
	content: g.string().args({
		path: g.string(),
	}),
	me: g.ref(UserType).description("Get logged in user."),

	watchtime: g
		.ref(WatchtimeType)
		.list()
		.args({
			limit: g.int().default(10),
			total: g.boolean().default(false),
		}),
	getTwitchUser: g.ref(TwitchUserType).list().args({
		user: g.id(),
	}),

	checkWhitelist: g.boolean(),
	checkWhitelistByUUID: g.boolean().args({
		uuid: g.string(),
	}),
});

export const mutationType = g.type("Mutation", {
	invalidateContent: g.ref(ResponseType).args({ path: g.string() }),
	tempContent: g
		.ref(ResponseType)
		.args({ path: g.string(), content: g.string() }),
	setContent: g
		.ref(ResponseType)
		.args({ path: g.string(), content: g.string() }),

	whitelistCode: g.string().args({ uuid: g.string() }),
	whitelistLink: g.ref(ResponseType).args({ code: g.int() }),
});
export { g };
