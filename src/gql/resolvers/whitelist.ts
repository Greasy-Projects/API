import { GraphQLError } from "graphql";
import { type Resolvers, cache } from "./index";
import { verifyAuth } from "~/auth";
import { db, schema } from "~/db";
import { Scope } from "~/scopes";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
const uuidRegex = new RegExp(
	"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
);

export const whitelistQuery: Resolvers["Query"] = {
	checkWhitelist: async (_, __, { request }) => {
		const data = await verifyAuth(request);
		const [linkedUser] = await db
			.selectDistinct()
			.from(schema.minecraftUsers)
			.where(eq(schema.minecraftUsers.userId, data.user.id));

		return linkedUser?.whitelisted ?? false;
	},
	checkWhitelistByUUID: async (_, { uuid }, { request }) => {
		if (!uuidRegex.test(uuid.toString()))
			throw new GraphQLError("Invalid UUID");
		await verifyAuth(request, [Scope.ReadWhitelist]);

		const [linkedUser] = await db
			.selectDistinct()
			.from(schema.minecraftUsers)
			.where(eq(schema.minecraftUsers.id, uuid));
		return linkedUser?.whitelisted ?? false;
	},
};

export const whitelistMutation: Resolvers["Mutation"] = {
	whitelistCode: async (_, { uuid }, { request }) => {
		if (!uuidRegex.test(uuid.toString()))
			throw new GraphQLError("Invalid UUID");
		await verifyAuth(request, [Scope.ManageWhitelist]);

		const makeOTP = (update?: number): string => {
			const date = new Date();
			const hash = createHash("sha256")
				.update(uuid)
				.update(`${date.getUTCHours()}/${date.getUTCMinutes()}}/${update}`)
				.digest("hex");
			const otp = parseInt(hash, 16) % 1000000;
			if (cache.get("mc-link:" + otp) === uuid)
				cache.set("mc-link:" + otp, uuid, 60 * 5);
			else if (cache.has("mc-link:" + otp)) return makeOTP(otp);
			cache.set("mc-link:" + otp, uuid, 60 * 5);
			return otp.toString().padStart(6, "0");
		};
		return makeOTP();
	},
	whitelistLink: async (_, { code }, { request }) => {
		const data = await verifyAuth(request);
		const uuid = cache.get("mc-link:" + code);
		if (!uuid) return { status: 202, message: "Invalid whitelist code" };
		if (typeof uuid !== "string")
			return { status: 500, message: "Something went wrong." };
		await db.insert(schema.minecraftUsers).values({
			id: uuid,
			userId: data.user.id,
		});
		return { status: 200, message: "You have been whitelisted!" };
	},
};
