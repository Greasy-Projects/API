import axios from "axios";
import { getToken } from "./auth";
import { db, watchtime } from "./db";
import { between, eq, sql } from "drizzle-orm";
const streamer = "greasymac";
export default async () => {
	const startOfMonth = new Date();
	const treshholdDate = new Date();
	treshholdDate.setMinutes(treshholdDate.getMinutes() - 5);
	startOfMonth.setUTCDate(1);
	startOfMonth.setUTCHours(0, 0, 0, 0);
	console.log(await db.select().from(watchtime));

	await db
		.insert(watchtime)
		.values({
			twitchId: "1111",
			date: startOfMonth,
		})
		.onDuplicateKeyUpdate({
			set: {
				time: sql`CASE WHEN VALUES(${watchtime.updatedAt}) < ${treshholdDate} THEN COALESCE(${watchtime.time}, 0) + 5 ELSE ${watchtime.time} END`,
			},
		});

	console.log(await db.select().from(watchtime));
	// const values = [
	// 	{
	// 		twitchId: "abc123",
	// 		time: 100,
	// 	},
	// 	{
	// 		twitchId: "def456",
	// 		time: 200,
	// 	},
	// ];
	// await db.insert(watchtime).values(values).onDuplicateKeyUpdate;

	return;
	try {
		const token = await getToken(streamer);

		// return console.log(await twitchAuth.refreshAccessToken(token.refresh_token));
		const live = await axios.get("https://api.twitch.tv/helix/streams", {
			params: {
				user_login: streamer,
			},
			headers: {
				Authorization: `Bearer ${token}`,
				"Client-Id": process.env.TWITCH_CLIENT_ID,
			},
		});
		if (!live.data.data.length) return;

		if (live.data?.data[0]?.type === "live") {
			// https://dev.twitch.tv/docs/api/reference/#get-chatters
			// TO-DO: Missing required paramter "moderator_id", access token needs to be a moderator of broadcaster

			const chatters = await axios.get(
				"https://api.twitch.tv/helix/chat/chatters",
				{
					params: {
						broadcaster_id: live.data?.data[0].user_id,
						moderator_id: live.data?.data[0].user_id,
					},
					headers: {
						Authorization: `Bearer ${token}`,
						"Client-Id": process.env.TWITCH_CLIENT_ID,
					},
				}
			);
			console.log(chatters.data);
		}
	} catch (e) {
		console.log("something went wrong whilst updating watchtime:", e);
	}
};
