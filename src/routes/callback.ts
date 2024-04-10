import express from "express";
import "dotenv/config";
import {
	DiscordUserResponse,
	Tokens,
	TwitchUserResponse,
	discordAuth,
	twitchAuth,
} from "../auth";
import { OAuth2RequestError } from "oslo/oauth2";
import { db, schema, secret } from "../db";
import { and, desc, eq, gte } from "drizzle-orm";
import { createJWT } from "oslo/jwt";
import { createId } from "@paralleldrive/cuid2";
import { TimeSpan } from "oslo";
import type { Request, Response } from "express";

const router = express.Router();

async function handleAuthCallback(req: Request, res: Response) {
	const redirectPath = req.cookies.redirect_path ?? "/";
	// const callbackURL =
	//   req.cookies.token_callback?.toString() ?? process.env.CALLBACK_URL;
	const callbackURL = process.env.CALLBACK_URL ?? "";
	const error = req.query.error?.toString() ?? null;
	const url = new URL(callbackURL);
	url.searchParams.set("redirect", redirectPath);
	if (error) return res.redirect(301, url.toString());

	const code = req.query.code?.toString() ?? null;
	const state = req.query.state?.toString() ?? null;
	const platform = req.query.platform?.toString() ?? null;
	const storedState = req.cookies.oauth_state ?? null;
	const storedScopes = req.cookies.oauth_scopes ?? null;
	if (
		!platform ||
		!(platform === "twitch" || platform === "discord") ||
		!storedState ||
		!storedScopes ||
		!code ||
		!state ||
		state !== storedState
	) {
		return res.status(400).send("Invalid request");
	}

	const user = {
		id: "",
		username: "",
		displayName: "",
		email: "",
		avatar: "",
	};
	let tokens!: Tokens;
	try {
		if (platform === "twitch") {
			tokens = await twitchAuth.validateAuthorizationCode(code);
			const twitchUserResponse = await fetch(
				"https://api.twitch.tv/helix/users",
				{
					headers: {
						Authorization: `Bearer ${tokens.accessToken}`,
						"Client-Id": process.env.TWITCH_CLIENT_ID || "",
					},
				}
			);
			const twitchUser: TwitchUserResponse = (await twitchUserResponse.json())
				.data[0];
			user.id = twitchUser.id;
			user.email = twitchUser.email;
			user.username = twitchUser.login;
			user.displayName = twitchUser.display_name;
			user.avatar = twitchUser.profile_image_url;
		}
		if (platform === "discord") {
			tokens = await discordAuth.validateAuthorizationCode(code);

			const discordUserResponse = await fetch(
				"https://discord.com/api/users/@me",
				{
					headers: {
						Authorization: `Bearer ${tokens.accessToken}`,
					},
				}
			);

			const discordUser: DiscordUserResponse = await discordUserResponse.json();
			user.id = discordUser.id;
			user.email = discordUser.email ?? "";
			user.username = discordUser.username;
			user.displayName = discordUser.global_name;
			user.avatar = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}`;
		}

		// Check if account already exists in database
		const [existingAccount] = await db
			.selectDistinct()
			.from(schema.accounts)
			.where(eq(schema.accounts.id, user.id));

		let userId!: string;
		const [emailMatch] = await db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.email, user.email))
			.limit(1);

		if (!existingAccount) {
			await db.transaction(async transaction => {
				// Check if user exists by email, else create a new user
				if (emailMatch && emailMatch.userId) {
					userId = emailMatch.userId;
				} else if (platform === "discord") {
					// Redirect to linking page or another appropriate action
					return res.status(403).send("Discord accounts can only be linked.");
				}

				// Insert the account and link it to the existing or new user
				await transaction.insert(schema.accounts).values({
					...user,
					platform,
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					expiresAt: tokens.accessTokenExpiresAt,
					scope: storedScopes,
					userId,
				});

				// Update the user with the primaryAccountId obtained from the inserted account
				if (!userId) {
					userId = createId();
					await transaction.insert(schema.users).values({
						id: userId,
						primaryAccountId: user.id,
					});
					await transaction
						.update(schema.accounts)
						.set({ userId })
						.where(eq(schema.accounts.id, user.id));
				}
			});
			// If account already exists we simply create a token for the user linked to that account
		} else userId = existingAccount.userId!;

		// Check if there is an existing and valid token for the user
		// This ensures we don't flood the database with tokens, and have 2 at max per user
		const D = new Date();
		D.setDate(D.getDate() + 15);
		const [existingSession] = await db
			.select()
			.from(schema.sessions)
			.where(
				// Make sure the token has at least 15 days left before expiry
				and(
					eq(schema.sessions.userId, userId),
					gte(schema.sessions.expiresAt, D)
				)
			)
			// Get the token with the longest time left before expiry
			.orderBy(desc(schema.sessions.expiresAt))
			.limit(1);

		let jwt!: string;
		if (existingSession) {
			jwt = existingSession.token;
		} else {
			const payload = {
				u: userId, // user (used for validation on api requests)
				a: user.id, // account (currently not actually used)
			};
			jwt = await createJWT("HS256", secret, payload, {
				expiresIn: new TimeSpan(30, "d"),
				issuer: "greasygang-api",
				includeIssuedTimestamp: true,
			});

			// Store the new token in the database
			await db.insert(schema.sessions).values({
				userId: userId,
				token: jwt,
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
			});
		}
		url.searchParams.set("token", jwt);

		res.redirect(301, url.toString());
	} catch (e) {
		if (e instanceof OAuth2RequestError) {
			return res.status(400).send("OAuth2 Request Error");
		}
		console.log(e);
		return res.status(500).send("Internal Server Error");
	}
}

router.get("/login/callback", async (req: Request, res: Response) => {
	await handleAuthCallback(req, res);
});

export default router;
