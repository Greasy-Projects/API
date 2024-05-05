import axios from "axios";
import { getToken } from "./auth";
import { db, watchtime } from "./db";
import { sql } from "drizzle-orm";
import { toSQLDate } from "./util";
const streamer = "greasymac";
export default async () => {
	const startOfMonth = new Date();
	startOfMonth.setUTCDate(1);
	startOfMonth.setUTCHours(0, 0, 0, 0);

	const thresholdDate = new Date();
	thresholdDate.setMinutes(thresholdDate.getMinutes() - 4);
	const FiveMinutesAgo = toSQLDate(thresholdDate);

	thresholdDate.setMinutes(thresholdDate.getMinutes() - 5);
	const TenMinutesAgo = toSQLDate(thresholdDate);

	console.log(FiveMinutesAgo);
	console.log(await db.select().from(watchtime));
	// on first watch we insert the user with a time of NULL
	// if the user has been watching for more than 5 minutes, which means the updatedAt is more than 5 minutes ago we set the time +5
	// if the user hasn't been updated for more than 10 minutes the user has left in between,
	// we set the updated at value but don't increase the time so the user will receive +5 on the next run taken they haven't left

	// we check for 4 and 9 minutes to account for api and db delays since we run at a 5 minute interval
	const WHEN_FIVE_THEN = sql`WHEN ${watchtime.updatedAt} < ${FiveMinutesAgo} THEN`;
	const WHEN_TEN_THEN = sql`WHEN ${watchtime.updatedAt} < ${TenMinutesAgo} THEN`;
	// 2024-05-05T16:28:34.000Z  <
	// 2024-05-05 15:37:40.596
	await db
		.insert(watchtime)
		.values({
			twitchId: "1111",
			date: startOfMonth,
			updatedAt: sql`${toSQLDate(new Date())}`,
		})
		.onDuplicateKeyUpdate({
			set: {
				time: sql`CASE ${WHEN_TEN_THEN} ${watchtime.time} ${WHEN_FIVE_THEN} COALESCE(${watchtime.time}, 0) + 5 ELSE ${watchtime.time} END`,
				updatedAt: sql`CASE ${WHEN_FIVE_THEN} ${toSQLDate(new Date())} ELSE ${watchtime.updatedAt} END`,
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
