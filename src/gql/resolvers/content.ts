import env from "~/env";
import { GraphQLError } from "graphql";
import axios from "axios";
import { type Resolvers, cache } from "./";
import { verifyAuth } from "../../auth";
import { Scope } from "../../scopes";
import { cleanFilePath } from "../../util";

const authToken = env.GITHUB_TOKEN;
const repoOwner = env.GITHUB_OWNER;
const repoName = env.GITHUB_REPO;
const gitContentURL = (filePath: string) =>
	`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

export const contentQuery: Resolvers["Query"] = {
	content: async (_, { path }) => {
		try {
			const cachedContent: string | undefined = cache.get(`content:${path}`);
			if (cachedContent) {
				const cachedTime: number | undefined = cache.get(
					`content:${path}:time`
				);
				const currentTime = Date.now();
				const timeDifference = currentTime - (cachedTime || 0);
				const fifteenMinutes = 15 * 60 * 1000;

				// If content is older than 15 minutes, fetch and update the cache for any subsequent requests
				if (!cachedTime || timeDifference >= fifteenMinutes)
					fetchAndUpdateCache(path);

				// Return cached content immediately.
				// We don't wait for expired content to be re-fetched because this adds delays.
				// If the content was fetched more than 15 minutes ago, we update the content for any subsequent requests, but not the current one.
				return cachedContent;
			}

			// If no cached content found, fetch and cache content from GitHub ()
			return fetchAndUpdateCache(path);
		} catch (error) {
			console.error(
				`Error fetching content from GitHub for path: ${path}`,
				error
			);
			throw new GraphQLError("Internal server error");
		}
	},
};

export const contentMutation: Resolvers["Mutation"] = {
	invalidateContent: async (_, { path }, { request }) => {
		await verifyAuth(request, [Scope.EditContent]);

		cache.del(`content:${path}:time`);
		try {
			await fetchAndUpdateCache(path);
		} catch {
			return { status: 202, message: "Content Invalidated, Failed to Refresh" };
		}
		return { status: 200, message: "Content Refreshed" };
	},
	tempContent: async (_, { path, content }, { request }) => {
		await verifyAuth(request, [Scope.EditContent]);

		cache.set(`content:${path}`, content, 300);
		cache.set(`content:${path}:time`, Date.now());
		return { status: 200, message: "Temporary Content Updated Successfully" };
	},
	setContent: async (_, { path, content }, { request }) => {
		const { account } = await verifyAuth(request, [Scope.EditContent]);

		try {
			const data = await fetchContentAndSha(path);
			if (atob(data.content) === content)
				return {
					status: 202,
					message: "Content has not changed.",
				};

			const sha = data.sha ?? undefined;
			const payload = {
				path: getFilePath(path),
				message: `${account.displayName} updated ${path}`,
				content: btoa(content),
				sha,
				committer: {
					name: "GreasyGang API",
					email: "GreasyGang-API@verycrunchy.dev",
				},
				author: {
					name: account.displayName,
					email: account.email ?? account.id + "+GreasyGang@verycrunchy.dev",
				},
			};

			await axios.put(gitContentURL(getFilePath(path)), payload, {
				headers: {
					Authorization: `token ${authToken}`,
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
			});
		} catch (e) {
			console.log(e);
			return { status: 500, message: "Something went wrong." };
		}
		cache.set(`content:${path}`, content, 3600);
		cache.set(`content:${path}:time`, Date.now());
		return { status: 200, message: "Content Set Successfully" };
	},
};
// const branch = env.CONTENT_BRANCH ?? "main";
const fetchAndUpdateCache = async (path: string) => {
	try {
		const content = await fetchContent(path);

		const jsonContent = JSON.stringify(content);
		cache.set(`content:${path}`, jsonContent, 3600);
		cache.set(`content:${path}:time`, Date.now());

		return jsonContent;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			if (error.response && error.response.status === 404) {
				cache.set(`content:${path}`, "", 3600);
				cache.set(`content:${path}:time`, Date.now());
			} else {
				console.error(
					`Error fetching content from GitHub for path: ${path}`,
					error
				);
			}
		} else {
			console.error(
				`Error fetching content from GitHub for path: ${path}`,
				error
			);
		}
		throw new GraphQLError("Internal server error");
	}
};

const getFilePath = (path: string) => cleanFilePath(path) + ".json";
const fetchContent = async (path: string) => {
	const { data } = await axios.get(gitContentURL(getFilePath(path)), {
		headers: {
			Authorization: `token ${authToken}`,
			Accept: "application/vnd.github.raw+json",
		},
	});

	return data;
};
const fetchContentAndSha = async (path: string) => {
	const { data } = await axios.get(gitContentURL(getFilePath(path)), {
		headers: {
			Authorization: `token ${authToken}`,
		},
	});

	return data;
};
