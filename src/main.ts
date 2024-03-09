import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import "dotenv/config";
import { createYoga } from "graphql-yoga";
import { schema as gql } from "./gql";
import { CronJob } from "cron";
import {
  Auth,
  AuthPlatform,
  AuthProvider,
  DiscordUserResponse,
  Tokens,
  TwitchUserResponse,
  verifyAuth,
} from "./auth";
import { OAuth2RequestError, generateState } from "oslo/oauth2";
import { db, schema } from "./db";
import type { Request, Response } from "express";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { createJWT } from "oslo/jwt";
import { createId } from "@paralleldrive/cuid2";
import { TimeSpan } from "oslo";
import { UserType } from "./db/schema";
const app = express();
app.use(cookieParser());
const yoga = createYoga({ schema: gql });
const yogaRouter = express.Router();
function checkEnvVars(envVars: string[]): void {
  const undefinedVars: string[] = [];
  envVars.forEach((envVar) => {
    if (!process.env[envVar] || process.env[envVar]?.trim() === "") {
      undefinedVars.push(envVar);
    }
  });

  if (undefinedVars.length > 0) {
    throw new Error(
      `Missing environment variables: ${undefinedVars.join(", ")}`
    );
  }
}

try {
  checkEnvVars([
    "DB_HOST",
    "DB_USER",
    "DB_PASS",
    "DB_NAME",
    "JWT_SECRET",
    "CALLBACK_URL",
    "BASE_URL",
    "TWITCH_CLIENT_ID",
    "TWITCH_CLIENT_SECRET",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
  ]);
} catch (error) {
  console.error(error);
  process.exit(1);
}

export const secret = new TextEncoder().encode(process.env.JWT_SECRET);

yogaRouter.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "style-src": ["'self'", "unpkg.com"],
        "script-src": ["'self'", "unpkg.com", "'unsafe-inline'"],
        "img-src": ["'self'", "raw.githubusercontent.com"],
      },
    },
  })
);
yogaRouter.use(yoga);
app.use(yoga.graphqlEndpoint, yogaRouter);

// Add the global CSP configuration for the rest of your server.
// app.use(helmet());

const discordAuth = new Auth(
  AuthPlatform.Discord,
  process.env.DISCORD_CLIENT_ID!,
  process.env.DISCORD_CLIENT_SECRET!,
  process.env.BASE_URL + "/login/callback?platform=discord"
);
const twitchAuth = new Auth(
  AuthPlatform.Twitch,
  process.env.TWITCH_CLIENT_ID!,
  process.env.TWITCH_CLIENT_SECRET!,
  process.env.BASE_URL + "/login/callback?platform=twitch"
);
app.get("/login/twitch", async (req: Request, res: Response) => {
  await handleAuth(req, res, twitchAuth);
});

app.get("/login/discord", async (req: Request, res: Response) => {
  await handleAuth(req, res, discordAuth);
});

app.get("/login/callback", async (req, res) => {
  await handleAuthCallback(req, res);
});

app.get("/token/validate", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.send(400);

  try {
    await verifyAuth(token, UserType.User);
    res.send(200);
  } catch (e) {
    res.status(401).send((e as Error).message);
  }
});
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Running at ${process.env.BASE_URL}`);
});

async function handleAuthCallback(req: Request, res: Response) {
  const redirectPath = req.cookies.redirect_path ?? "/";
  // const callbackURL =
  //   req.cookies.token_callback?.toString() ?? process.env.CALLBACK_URL;
  const callbackURL = process.env.CALLBACK_URL ?? "";
  const error = req.query.error?.toString() ?? null;
  let url = new URL(callbackURL);
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

  let user = {
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
      await db.transaction(async (transaction) => {
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

async function handleAuth(
  req: Request,
  res: Response,
  authInstance: AuthProvider
) {
  const state = generateState();
  const { scopes, redirect, token_callback } = req.query;
  if (!scopes || scopes === "") {
    return res.status(400).send("Scopes are required.");
  }
  if (redirect) res.cookie("redirect_path", redirect, { httpOnly: true });
  res.cookie("oauth_state", state, { httpOnly: true });
  res.cookie("oauth_scopes", scopes, { httpOnly: true });
  if (token_callback)
    res.cookie("token_callback", token_callback, { httpOnly: true });
  const scopesArray = scopes.toString().split(" ");
  const url = await authInstance.createAuthorizationURL(state, {
    scopes: scopesArray.length ? scopesArray : undefined,
  });
  res.redirect(url.toString());
}

async function removeExpiredSessions() {
  try {
    await db
      .delete(schema.sessions)
      .where(lte(schema.sessions.expiresAt, new Date()));
  } catch (error) {
    console.error("Error removing expired sessions:", error);
  }
}
// At 00:00 on Sunday
new CronJob("0 0 * * 0", removeExpiredSessions).start();
