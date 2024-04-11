import express from "express";
import axios from "axios";
import { db, schema } from "~/db";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";

const router = express.Router();
const streamer = "greasymac";

router.get("/live", async (req: Request, res: Response) => {
	// const token = (
	// 	await axios.post("https://id.twitch.tv/oauth2/token", null, {
	// 		params: {
	// 			client_id: process.env.TWITCH_CLIENT_ID,
	// 			client_secret: process.env.TWITCH_CLIENT_SECRET,
	// 			grant_type: "client_credentials",
	// 		},
	// 	})
	// ).data;
	const [token] = await db
		.select({ access_token: schema.accounts.accessToken })
		.from(schema.accounts)
		.where(eq(schema.accounts.username, streamer));
		console.log(token)
	if (!("access_token" in token)) return res.status(500);
	const live = await axios.get("https://api.twitch.tv/helix/streams", {
		params: {
			user_login: streamer,
		},
		headers: {
			Authorization: `Bearer ${token.access_token}`,
			"Client-Id": process.env.TWITCH_CLIENT_ID,
		},
	});
	res.send(live.data);

	if (live.data?.data[0]?.type === "live") {
		// https://dev.twitch.tv/docs/api/reference/#get-chatters
		// TO-DO: Missing required paramter "moderator_id", access token needs to be a moderator of broadcaster
		const [token] = await db
			.select({ token: schema.accounts.accessToken })
			.from(schema.accounts)
			.where(eq(schema.accounts.id, live.data?.data[0].user_id));
		//TODO: update to greasy
		const chatters = await axios.get(
			"https://api.twitch.tv/helix/chat/chatters",
			{
				params: {
					broadcaster_id: live.data?.data[0].user_id,
					moderator_id: live.data?.data[0].user_id,
				},
				headers: {
					Authorization: `Bearer ${token.access_token}`,
					"Client-Id": process.env.TWITCH_CLIENT_ID,
				},
			}
		);

		res.json(chatters.data);
	}

	res.status(200).json({});
});

export default router;
