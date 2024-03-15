import { GraphQLError } from "graphql";
import axios, { AxiosError } from "axios";
import jsyaml from "js-yaml";
import { cache } from "../resolvers";
import { type Resolvers } from "./";
import { verifyAuth } from "../../auth";
import { UserType } from "../../db/schema";
import { json } from "stream/consumers";

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
        if (cachedTime && timeDifference >= fifteenMinutes)
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
    await verifyAuth(request, UserType.Editor);

    cache.del(`content:${path}`);
    cache.del(`content:${path}:time`);
    try {
      await fetchAndUpdateCache(path);
    } catch {
      return { status: 202, message: "Content Invalidated, Failed to Refresh" };
    }
    return { status: 200, message: "Content Refreshed" };
  },
  tempContent: async (_, { path, content }, { request }) => {
    await verifyAuth(request, UserType.Editor);

    cache.set(`content:${path}`, content, 300);
    cache.set(`content:${path}:time`, Date.now());
    return { status: 200, message: "Temporary Content Updated Successfully" };
  },
  setContent: async (_, { path, content }, { request }) => {
    let { account } = await verifyAuth(request, UserType.Editor);

    try {
      const authToken = process.env.GITHUB_TOKEN
      const repoOwner = "Greasy-Projects";
      const repoName = "content";
      const filePath = path.replace(/^\/|\/$/g, "") + ".json";

      const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

      let existingFile;
      try {
        const { data } = await axios.get(githubApiUrl, {
          headers: {
            Authorization: `token ${authToken}`,
          },
        });
        existingFile = data;
      } catch (error) {
        existingFile = null;
      }
      const payload = {
        path: filePath,
        message: `${account.displayName} updated ${filePath}`,
        content: btoa(content),
        sha: existingFile?.sha,
        committer: {
          name: "GreasyGang API",
          email: "GreasyGang-API@verycrunchy.dev",
        },
        author: {
          name: account.displayName,
          email: account.displayName + "+GreasyGang-API@verycrunchy.dev",
        },
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      };

      await axios.put(githubApiUrl, payload, {
        headers: {
          Authorization: `token ${authToken}`,
        },
      });
    } catch (e) {
      return { status: 500, message: "Something went wrong." };
    }
    cache.set(`content:${path}`, content, 3600);
    cache.set(`content:${path}:time`, Date.now());
    return { status: 200, message: "Content Set Successfully" };
  },
};
const branch = process.env.CONTENT_BRANCH ?? "main";
const fetchAndUpdateCache = async (path: string) => {
  try {
    const response = await axios.get(
      `https://raw.githubusercontent.com/greasy-projects/content/${branch}/${path}.json?timestamp=${new Date().getTime()}`,
      {}
    );

    const jsonContent = JSON.stringify(response.data);
    // Update the cache
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
