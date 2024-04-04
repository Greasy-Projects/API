import express from "express";
import { db, schema } from "../db";
import { and, eq, gte } from "drizzle-orm";
import type { Request, Response } from "express";
import { verifyAuth } from "../auth";

const router = express.Router();
const uuidRegex = new RegExp("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

router.post("/createCode", async (req: Request, res: Response) => {
    //TODO: Add passkey/token so only server can create codes

    const { uuid } = req.query;
    if (!uuid) return res.status(400).json({
        error: "UUID is required"
    });

    if (!uuidRegex.test(uuid.toString())) return res.status(400).json({
        error: "Invalid UUID"
    });

    // create 6 digit code
    const token = Math.floor(100000 + Math.random() * 900000);

    await db.insert(schema.sessions).values({
        userId: uuid.toString(),
        token: token.toString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60) // expires in 1 hour
    })

    res.json({
        token,
        uuid
    });
});

// An endpoint to link the twitch user with the mc user, when the code is provided.
router.post("/link", async (req: Request, res: Response) => {
    const { uuid, code } = req.query;
    const token = req.headers.authorization;

    if (!token) return res.status(401).json({
        error: "Unauthorized"
    });

    if (!uuid || !code) return res.status(400).json({
        error: "UUID and code are required"
    });

    if (!uuidRegex.test(uuid.toString())) return res.status(400).json({
        error: "Invalid UUID"
    });

    try {
        const user = await verifyAuth(token);

        if(!user) return res.status(401).json({
            error: "Unauthorized"
        });

        // Link the user
        await db.insert(schema.minecraftUsers).values({
            userId: user.user.id,
            minecraftUuid: uuid.toString()
        });

        // TODO: Add rcon command to whitelist the user

        return res.json({
            success: true
        });
    } catch (e) {
        return res.status(500).json({
            success: false
        });
    }
});

// And an endpoint to check if a user is linked already or not
router.get("/check", async (req: Request, res: Response) => {
    const token = req.headers.authorization;
    let id = req.query.id;

    try {
        if(!id && token) {
            const user = await verifyAuth(token);
            id = user.user.id;
        }

        if(!id) return res.status(400).json({
            error: "ID is required"
        });

        const [linkedUser] = await db
            .select()
            .from(schema.minecraftUsers)
            .where(
                eq(schema.minecraftUsers.userId, id.toString())
            );

        return res.json({
            linked: !!linkedUser
        });
    } catch (e) {
        return res.status(500).json({
            success: false
        });
    }
});

export default router;