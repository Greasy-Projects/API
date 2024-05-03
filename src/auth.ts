import env from "~/env";
import { OAuth2Client } from "oslo/oauth2";
import { TimeSpan, createDate } from "oslo";
import { validateJWT } from "oslo/jwt";
import { schema, db, secret } from "./db";
import { and, eq, or } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { ScopeGroup, Scope } from "./scopes";
import { access } from "fs";

const discordAuthorizeEndpoint = "https://discord.com/oauth2/authorize";
const discordTokenEndpoint = "https://discord.com/api/oauth2/token";

const twitchAuthorizeEndpoint = "https://id.twitch.tv/oauth2/authorize";
const twitchTokenEndpoint = "https://id.twitch.tv/oauth2/token";

export class Auth implements AuthProvider {
	private client: OAuth2Client;
	private clientSecret: string;
	private authorizeEndpoint: string;
	private tokenEndpoint: string;
	constructor(
		platform: AuthPlatform,
		clientId: string,
		clientSecret: string,
		redirectURI: string
	) {
		this.clientSecret = clientSecret;
		if (platform === AuthPlatform.Discord) {
			this.authorizeEndpoint = discordAuthorizeEndpoint;
			this.tokenEndpoint = discordTokenEndpoint;
		} else if (platform === AuthPlatform.Twitch) {
			this.authorizeEndpoint = twitchAuthorizeEndpoint;
			this.tokenEndpoint = twitchTokenEndpoint;
		} else {
			throw new Error("Invalid platform");
		}

		this.client = new OAuth2Client(
			clientId,
			this.authorizeEndpoint,
			this.tokenEndpoint,
			{
				redirectURI,
			}
		);
		this.clientSecret = clientSecret;
	}

	public async createAuthorizationURL(
		state: string,
		options?: {
			scopes?: string[];
		}
	): Promise<URL> {
		return await this.client.createAuthorizationURL({
			state,
			scopes: options?.scopes ?? [],
		});
	}

	public async validateAuthorizationCode(code: string): Promise<Tokens> {
		const result =
			await this.client.validateAuthorizationCode<TokenResponseBody>(code, {
				authenticateWith: "request_body",
				credentials: this.clientSecret,
			});
		const tokens: Tokens = {
			accessToken: result.access_token,
			refreshToken: result.refresh_token,
			accessTokenExpiresAt: createDate(new TimeSpan(result.expires_in, "s")),
			scope: String(result.scope).replace(",", " "),
		};
		return tokens;
	}

	public async refreshAccessToken(refreshToken: string): Promise<Tokens> {
		const result = await this.client.refreshAccessToken<TokenResponseBody>(
			refreshToken,
			{
				authenticateWith: "request_body",
				credentials: this.clientSecret,
			}
		);
		const tokens: Tokens = {
			accessToken: result.access_token,
			refreshToken: result.refresh_token,
			accessTokenExpiresAt: createDate(new TimeSpan(result.expires_in, "s")),
			scope: String(result.scope).replace(",", " "),
		};
		return tokens;
	}
}

export enum AuthPlatform {
	Discord = "discord",
	Twitch = "twitch",
}

interface TokenResponseBody {
	access_token: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

export interface Tokens {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: Date;
	scope: string;
}

export interface DiscordUserResponse {
	id: string;
	username: string;
	discriminator: string;
	global_name: string;
	avatar: string;
	bot?: boolean;
	system?: boolean;
	mfa_enabled?: boolean;
	locale?: string;
	verified?: boolean;
	email: string | null;
	flags?: number;
	premium_type?: number;
	public_flags?: number;
}

export interface TwitchUserResponse {
	id: string;
	login: string;
	email: string;
	display_name: string;
	type: string;
	broadcaster_type: string;
	description: string;
	profile_image_url: string;
	offline_image_url: string;
	view_count: number;
	created_at: string;
}

export interface AuthProvider {
	createAuthorizationURL(
		state: string,
		options?: {
			scopes?: string[];
		}
	): Promise<URL>;
	validateAuthorizationCode(code: string): Promise<Tokens>;
	refreshAccessToken?(refreshToken: string): Promise<Tokens>;
}

type payload = { u: string; a: string };
export async function verifyAuth(request: Request | string, scopes?: Scope[]) {
	let token: string;
	if (typeof request !== "string") {
		const header = request.headers.get("authorization");
		if (!header) {
			throw new GraphQLError("Missing Authorization header");
		}

		const parts = header.split(" ");
		if (parts.length !== 2 || parts[0] !== "Bearer")
			throw new GraphQLError("Invalid Authorization header");
		token = parts[1];
	} else token = request;

	let payload: payload;
	// Make sure the token is valid and has not been tampered with
	try {
		// This function will throw an error incase of; invalid signature, expired token or inactive token (`nbf`)
		// https://oslo.js.org/reference/jwt/validateJWT
		const jwt = await validateJWT("HS256", secret, token);
		payload = jwt.payload as payload;
	} catch (e) {
		throw new GraphQLError("Invalid token");
	}

	if (!payload.a || !payload.u) throw new GraphQLError("Invalid token payload");

	const [user] = await db
		.selectDistinct()
		.from(schema.users)
		.where(and(eq(schema.users.id, payload.u)));

	//check permissions
	if (scopes) {
		const userScopes: string[] | undefined = user.scope?.split(" ");
		const hasScopes: string[] = [];
		// Check scopes from user's group
		if (userScopes) {
			hasScopes.push(...userScopes);
			for (const scope of userScopes) {
				if (scope.startsWith("group:")) {
					const groupName = scope.replace("group:", "");
					const groupScopes = ScopeGroup[groupName];
					if (groupScopes) {
						for (const groupScope of groupScopes) {
							hasScopes.push(groupScope);
						}
					}
				}
			}
		}

		if (!scopes.every(requiredScope => hasScopes.includes(requiredScope))) {
			const missingScopes = scopes.filter(
				requiredScope => !hasScopes.includes(requiredScope)
			);
			const errorMessage = `Insufficient permissions.\nRequired: ${missingScopes.join(
				", "
			)}`;
			throw new GraphQLError(errorMessage);
		}
	}
	const [account] = await db
		.selectDistinct()
		.from(schema.accounts)
		.where(
			and(
				eq(schema.accounts.userId, payload.u),
				eq(schema.accounts.id, payload.a)
			)
		);

	const [session] = await db
		.selectDistinct()
		.from(schema.sessions)
		.where(
			and(
				eq(schema.sessions.userId, payload.u),
				eq(schema.sessions.token, token)
			)
		);

	if (!session) throw new GraphQLError("Invalid session");

	return { user, account, payload };
}

export async function getToken(user: string): Promise<string> {
	const [res] = await db
		.select({
			token: schema.accounts.accessToken,
			refresh_token: schema.accounts.refreshToken,
			expires_at: schema.accounts.expiresAt,
		})
		.from(schema.accounts)
		.where(
			or(eq(schema.accounts.id, user), eq(schema.accounts.username, user))
		);
	if (!res) throw new Error("Couldn't find user: " + user);
	// check if token has expired
	if (res.expires_at.getTime() < Date.now()) {
		const refresh = await twitchAuth.refreshAccessToken(res.refresh_token);
		db.update(schema.accounts)
			.set({
				accessToken: refresh.accessToken,
				refreshToken: refresh.refreshToken,
				expiresAt: refresh.accessTokenExpiresAt,
				scope: refresh.scope,
			})
			.where(
				or(eq(schema.accounts.id, user), eq(schema.accounts.username, user))
			);
		return refresh.accessToken;
	}
	return res.token;
}

export const discordAuth = new Auth(
	AuthPlatform.Discord,
	env.DISCORD_CLIENT_ID,
	env.DISCORD_CLIENT_SECRET,
	env.BASE_URL + "/login/callback?platform=discord"
);

export const twitchAuth = new Auth(
	AuthPlatform.Twitch,
	env.TWITCH_CLIENT_ID,
	env.TWITCH_CLIENT_SECRET,
	env.BASE_URL + "/login/callback?platform=twitch"
);
