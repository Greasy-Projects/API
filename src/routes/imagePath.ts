import env from "../env";
import express from "express";
import axios from "axios";
import { cleanFilePath } from "../util";

import type { Request, Response } from "express";

const router = express.Router();

router.get("/image/*imagePath", async (req: Request, res: Response) => {
	const { imagePath } = req.params;
	const path = Array.isArray(imagePath) ? imagePath.join("/") : imagePath;

	try {
		const authToken = env.GITHUB_TOKEN;
		const repoOwner = env.GITHUB_OWNER;
		const repoName = env.GITHUB_REPO;

		const { data } = await axios.get(
			`https://raw.githubusercontent.com/${repoOwner}/${repoName}/${cleanFilePath(
				path
			)}`,
			{
				headers: {
					Authorization: `token ${authToken}`,
				},
				responseType: "arraybuffer",
			}
		);
		res.setHeader("Cache-Control", "max-age=43200");
		res.type(path);
		res.send(data);
	} catch (error) {
		const status = axios.isAxiosError(error) ? error.response?.status : undefined;
		console.error("Failed to load image from content repo:", {
			path,
			status,
		});
		res.sendStatus(404);
	}
});

export default router;
