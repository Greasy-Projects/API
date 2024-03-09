import { GraphQLError } from "graphql";
import axios from "axios";
import jsyaml from "js-yaml";
import { cache } from "../resolvers";
import { type Resolvers } from "./";

const contentResolver: Resolvers["Query"] = {
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
const branch = process.env.CONTENT_BRANCH ?? "main";
const fetchAndUpdateCache = async (path: string) => {
  try {
    const response = await axios.get(
      `https://raw.githubusercontent.com/greasy-projects/content/${branch}/${path}.yml`
    );
    const yamlContent = response.data;
    const contentObject = jsyaml.load(yamlContent);
    const jsonContent = JSON.stringify(contentObject);

    // Update the cache
    cache.set(`content:${path}`, jsonContent);
    cache.set(`content:${path}:time`, Date.now());

    return jsonContent;
  } catch (error) {
    console.error(
      `Error fetching content from GitHub for path: ${path}`,
      error
    );
    throw new GraphQLError("Internal server error");
  }
};
export default contentResolver;
