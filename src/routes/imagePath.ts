import env from "~/env";
import express from "express";
import axios from "axios";
import { cleanFilePath } from "../util";

import type { Request, Response } from "express";

const router = express.Router();

router.get("/image/:imagePath(*)", async (req: Request, res: Response) => {
	try {
		const { imagePath } = req.params;
		const authToken = env.GITHUB_TOKEN;
		const repoOwner = env.GITHUB_OWNER;
		const repoName = env.GITHUB_REPO;

		const { data } = await axios.get(
			`https://raw.githubusercontent.com/${repoOwner}/${repoName}/${cleanFilePath(
				imagePath
			)}`,
			{
				headers: {
					Authorization: `token ${authToken}`,
				},
				responseType: "arraybuffer",
			}
		);
		res.setHeader("Cache-Control", "max-age=43200");
		res.setHeader("Content-Type", "image/png");
		res.send(data);
	} catch (error) {
		res.status(404);
	}
});

export default router;
