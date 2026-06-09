import axios from "axios";
import { getToken } from "./auth";
import { db, watchtime } from "./db";
import { sql } from "drizzle-orm";
const streamer = "greasymac";
const ONE_MINUTE = 60 * 1000;
const UPDATE_GRACE_PERIOD = 55 * 1000;
const STALE_VIEWER_PERIOD = 3 * ONE_MINUTE;

// IN TESTING
export default async () => {
	const startOfMonth = new Date();
	startOfMonth.setUTCDate(1);
	startOfMonth.setUTCHours(0, 0, 0, 0);

	const now = new Date();
	const oneMinuteAgo = new Date(now.getTime() - UPDATE_GRACE_PERIOD);
	const staleViewerSince = new Date(now.getTime() - STALE_VIEWER_PERIOD);

	// New viewers start at 0 minutes. Existing viewers gain one minute when
	// they are still present after roughly a minute.
	//
	// If a viewer has not been seen for several minutes, treat this run as
	// their return and refresh updatedAt without adding missed time.

	const WHEN_ONE_MINUTE_THEN = sql`WHEN ${watchtime.updatedAt} < ${oneMinuteAgo} THEN`;
	const WHEN_STALE_THEN = sql`WHEN ${watchtime.updatedAt} < ${staleViewerSince} THEN`;

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
					updatedAt: new Date(),
				});
			}
			await db
				.insert(watchtime)
				.values(values)
				.onConflictDoUpdate({
					target: [watchtime.twitchId, watchtime.date],
					set: {
						time: sql`CASE ${WHEN_STALE_THEN} ${watchtime.time} ${WHEN_ONE_MINUTE_THEN} ${watchtime.time} + 1 ELSE ${watchtime.time} END`,
						updatedAt: sql`CASE ${WHEN_ONE_MINUTE_THEN} ${now} ELSE ${watchtime.updatedAt} END`,
					},
				});
		}
	} catch (e) {
		console.log("something went wrong whilst updating watchtime:", e);
	}
};
