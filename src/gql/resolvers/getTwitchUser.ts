import axios from "axios";
import { type Resolvers } from ".";
import { getClientToken } from "~/auth";

const watchtimeResolver: Resolvers["Query"] = {
	getTwitchUser: async (_, query) => {
		const queryString = `${isNaN(Number(query.user)) ? "login" : "id"}=${query.user}`;

		const res = await axios.get(
				"https://api.twitch.tv/helix/users?" + queryString,
				{
					headers: {
						Authorization: `Bearer ${await getClientToken()}`,
						"Client-Id": process.env.TWITCH_CLIENT_ID,
					},
				}
			),
			userData = res.data.data as {
				id: string;
				login: string;
				display_name: string;
				type: string;
				broadcaster_type: string;
				description: string;
				profile_image_url: string;
				view_count: number;
				created_at: string;
			}[];
		return userData;
	},
};
export default watchtimeResolver;
