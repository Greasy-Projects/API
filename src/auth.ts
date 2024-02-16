import { OAuth2Client } from "oslo/oauth2";
import { TimeSpan, createDate } from "oslo";
import { validateJWT } from "oslo/jwt";
import { schema, db } from "./db";
import { secret } from "./main";
import { and, eq } from "drizzle-orm";

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
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
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
export async function verifyAuth(request: Request | string): Promise<payload> {
  let token: string;
  if (typeof request !== "string") {
    const header = request.headers.get("authorization");
    if (!header) {
      throw new Error("Missing Authorization header");
    }

    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      throw new Error("Invalid Authorization header");
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
    throw new Error("Invalid token");
  }

  if (!payload.a || !payload.u) throw new Error("Invalid token payload");

  const [session] = await db
    .selectDistinct()
    .from(schema.sessions)
    .where(
      and(eq(schema.sessions.userId, payload.u), eq(schema.sessions.token, token))
    );

  if (!session) throw new Error("Invalid session");

  return payload;
}
