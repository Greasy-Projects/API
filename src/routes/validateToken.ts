import { Router } from "express";
import { verifyAuth } from "../auth";

export const router = Router();

router.get("/token/validate", async (req, res) => {
	const token = req.headers.authorization;
	if (!token) return res.sendStatus(400);
	try {
		await verifyAuth(token);
		res.sendStatus(200);
	} catch (e) {
		res.sendStatus(401);
	}
});

export default router;
