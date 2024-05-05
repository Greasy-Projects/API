import axios from "axios";
import { getToken } from "./auth";
import { db, watchtime } from "./db";
import { sql } from "drizzle-orm";
import { toSQLDate } from "./util";
const streamer = "greasymac";

// IN TESTING
export default async () => {
	const startOfMonth = new Date();
	startOfMonth.setUTCDate(1);
	startOfMonth.setUTCHours(0, 0, 0, 0);

	const thresholdDate = new Date();
	thresholdDate.setMinutes(thresholdDate.getMinutes() - 4.7); //4.7 to account for potential delays
	const FiveMinutesAgo = toSQLDate(thresholdDate);

	thresholdDate.setMinutes(thresholdDate.getMinutes() - 5);
	const TenMinutesAgo = toSQLDate(thresholdDate);

	// When a viewer is first observed, their record is inserted into the database with a NULL value for their watch time.

	// If the viewer has been active for more than 5 minutes (indicating their last update was more than 5 minutes ago),
	// their watch time is increased by 5 minutes.

	// If the viewer hasn't been updated for more than 10 minutes, it suggests they have stopped watching at some point in between.
	// In this case, we update the "updatedAt" value to the current time,
	// but we don't increase their watch time.
	// This ensures that they will receive a +5 increment on the next run,
	// assuming they haven't left and continue watching.

	const WHEN_FIVE_THEN = sql`WHEN ${watchtime.updatedAt} < ${FiveMinutesAgo} THEN`;
	const WHEN_TEN_THEN = sql`WHEN ${watchtime.updatedAt} < ${TenMinutesAgo} THEN`;

	// console.log(await db.select().from(watchtime));

	try {
		const token = await getToken(streamer);

		// Check if the streamer is live
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

		// If the stream is live, fetch viewer information
		if (live.data?.data[0]?.type === "live") {
			const chatters = await axios.get(
				"https://api.twitch.tv/helix/chat/chatters",
				{
					params: {
						broadcaster_id: live.data?.data[0].user_id,
						moderator_id: live.data?.data[0].user_id,
						first: 1000,
					},
					headers: {
						Authorization: `Bearer ${token}`,
						"Client-Id": process.env.TWITCH_CLIENT_ID,
					},
				}
			);

			const viewers = chatters.data.data as { user_id: string }[];

			// Prepare values for batch insertion
			const values = [];
			for (const viewer of viewers) {
				values.push({
					twitchId: viewer.user_id,
					date: startOfMonth,
					updatedAt: sql`${toSQLDate(new Date())}`,
				});
			}
			await db
				.insert(watchtime)
				.values(values)
				.onDuplicateKeyUpdate({
					set: {
						time: sql`CASE ${WHEN_TEN_THEN} ${watchtime.time} ${WHEN_FIVE_THEN} COALESCE(${watchtime.time}, 0) + 5 ELSE ${watchtime.time} END`,
						updatedAt: sql`CASE ${WHEN_FIVE_THEN} ${toSQLDate(new Date())} ELSE ${watchtime.updatedAt} END`,
					},
				});
		}
	} catch (e) {
		console.log("something went wrong whilst updating watchtime:", e);
	}
};
