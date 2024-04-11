import { Router } from "express";
import { verifyAuth } from "../auth";

export const router = Router();

router.get("/token/validate", async (req, res) => {
	const token = req.headers.authorization;
	if (!token) return res.send(400);

	try {
		await verifyAuth(token);
		res.status(200);
	} catch (e) {
		res.status(401).send((e as Error).message);
	}
});

export default router;
