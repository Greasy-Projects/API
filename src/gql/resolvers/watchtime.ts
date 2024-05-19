import axios from "axios";
import { db, watchtime } from "~/db";
import { type Resolvers } from "./";
import { and, eq, asc, desc, inArray, not, sql } from "drizzle-orm";
import { getClientToken } from "~/auth";
const excludedBots = [
	"100135110", //streamelements
	"19264788", //nightbot
	"807869712", //peepostreambot
	"68136884", //supibot
];
const excludedUsers = [
	"43547909", //drapsnatt
	"172254892", //d0nk7
	"79343170", //tsaeb
	"708701718", // 8roe
];
const watchtimeResolver: Resolvers["Query"] = {
	watchtime: async (_, query) => {
		const limit = Math.min(query.limit, 100);
		let times: {
			time: number | null;
			id: string;
		}[];
		if (query.total)
			times = await db
				.select({
					time: sql<number>`sum(${watchtime.time})`,
					id: watchtime.twitchId,
				})
				.from(watchtime)
				.limit(limit)
				.where(
					not(inArray(watchtime.twitchId, [...excludedBots, ...excludedUsers]))
				)
				.groupBy(watchtime.twitchId)
				// sort by oldest account (based on auto incremented twitch id) if times are similar
				.orderBy(desc(watchtime.time), asc(watchtime.twitchId));
		else {
			const startOfMonth = new Date();
			startOfMonth.setUTCDate(1);
			startOfMonth.setUTCHours(0, 0, 0, 0);
			times = await db
				.select({
					time: watchtime.time,
					id: watchtime.twitchId,
				})
				.from(watchtime)
				.limit(limit)
				.where(
					and(
						not(
							inArray(watchtime.twitchId, [...excludedBots, ...excludedUsers])
						),
						eq(watchtime.date, startOfMonth)
					)
				)
				// sort by oldest account (based on auto incremented twitch id) if times are similar
				.orderBy(desc(watchtime.time), asc(watchtime.twitchId));
		}
		const userIds = times.map(entry => entry.id);

		const idParam = userIds.map(id => `id=${id}`).join("&");
		const res = await axios.get(
				"https://api.twitch.tv/helix/users?" + idParam,
				{
					headers: {
						Authorization: `Bearer ${await getClientToken()}`,
						"Client-Id": process.env.TWITCH_CLIENT_ID,
					},
				}
			),
			userData = res.data.data as {
				id: string;
				display_name: string;
				profile_image_url: string;
			}[];
		return times
			.map(entry => {
				const data = userData.find(user => user.id === entry.id);
				if (!data) return null;

				return {
					displayName: data.display_name,
					time: entry.time ?? 0,
					avatar: data.profile_image_url,
				};
			})
			.filter(e => e !== null);
	},
};
export default watchtimeResolver;
