import express from "express";
import {
	AuthProvider,
    discordAuth,
    twitchAuth
} from "../auth";
import { generateState } from "oslo/oauth2";

import type { Request, Response } from "express";

const router = express.Router();

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

router.get("/login/twitch", async (req: Request, res: Response) => {
	await handleAuth(req, res, twitchAuth);
});

router.get("/login/discord", async (req: Request, res: Response) => {
	await handleAuth(req, res, discordAuth);
});

export default router;