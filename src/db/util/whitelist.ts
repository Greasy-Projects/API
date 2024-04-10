import { eq } from "drizzle-orm";
import { TimeSpan } from "oslo";
import { createJWT } from "oslo/jwt";
import { db, connection, schema, secret } from "~/db";
import { Scope } from "~/scopes";
export default async function createWhitelistUser() {
	await db.transaction(async transaction => {
		const id = "system:whitelist";
		const date = new Date();
		date.setFullYear(date.getFullYear() + 20);

		await transaction
			.insert(schema.accounts)
			.values({
				id,
				platform: "twitch",
				accessToken: id,
				refreshToken: id,
				expiresAt: date,
				scope: "",
				displayName: id,
				username: id,
			})
			.onDuplicateKeyUpdate({
				set: {
					id,
				},
			});

		await transaction
			.insert(schema.users)
			.values({
				id,
				scope: [Scope.ReadWhitelist, Scope.ManageWhitelist].join(" "),
				primaryAccountId: id,
			})
			.onDuplicateKeyUpdate({
				set: { id },
			});
		await transaction
			.update(schema.accounts)
			.set({ userId: id })
			.where(eq(schema.accounts.id, id));
		const payload = {
			u: id,
			a: id,
		};
		const jwt = await createJWT("HS256", secret, payload, {
			expiresIn: new TimeSpan(2000, "w"),
			issuer: "greasygang-api",
			includeIssuedTimestamp: true,
		});
		await transaction.delete(schema.sessions).where(eq(schema.sessions.userId, id));
		await transaction
			.insert(schema.sessions)
			.values({
				userId: id,
				token: jwt,
				expiresAt: date,
			})
			.onDuplicateKeyUpdate({
				set: {
					userId: id,
				},
			});
		console.log("whitelist token;", jwt);
	});
	connection.end();
}
