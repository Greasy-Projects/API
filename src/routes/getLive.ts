import express from "express";
import axios from "axios";

import type { Request, Response } from "express";

const router = express.Router();
const streamer = "GreasyMac";

router.get("/live", async (req: Request, res: Response) => {
	const token = (
		await axios.post("https://id.twitch.tv/oauth2/token", null, {
			params: {
				client_id: process.env.TWITCH_CLIENT_ID,
				client_secret: process.env.TWITCH_CLIENT_SECRET,
				grant_type: "client_credentials",
			},
		})
	).data;
	if (!("access_token" in token)) return res.status(500);
	const live = await axios.get(
		"https://api.twitch.tv/helix/streams?user_login=" + streamer,
		{
			headers: {
				Authorization: `Bearer ${token.access_token}`,
				"Client-Id": process.env.TWITCH_CLIENT_ID,
			},
		}
	);
	console.log(live.data);

	if (live.data?.data[0]?.type === "live") {
		// https://dev.twitch.tv/docs/api/reference/#get-chatters
		// TO-DO: Missing required paramter "moderator_id", access token needs to be a moderator of broadcaster
		const chatters = await axios.get(
			"https://api.twitch.tv/helix/chat/chatters?broadcaster_id=" +
				live.data.data[0].user_id,
			{
				params: {
					broadcaster_id: live.data?.data[0].broadcaster_id,
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
