import axios from "axios";
import { db, watchtime } from "~/db";
import { type Resolvers } from "./";
import { asc, desc, inArray, not } from "drizzle-orm";
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
];
const watchtimeResolver: Resolvers["Query"] = {
	watchtime: async (_, query) => {
		const limit = Math.min(query.limit, 100);
		console.log(limit);
		const times = await db
			.select({
				time: watchtime.time,
				id: watchtime.twitchId,
			})
			.from(watchtime)
			.limit(limit)
			.where(
				not(inArray(watchtime.twitchId, [...excludedBots, ...excludedUsers]))
			)
			// sort by oldest account (based on auto incremented twitch id) if times are similar
			.orderBy(desc(watchtime.time), asc(watchtime.twitchId));
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
		return times.map(entry => {
			const data = userData.find(user => user.id === entry.id);
			return {
				displayName: data!.display_name,
				time: entry.time ?? 0,
				avatar: data!.profile_image_url,
			};
		});
	},
};
export default watchtimeResolver;
