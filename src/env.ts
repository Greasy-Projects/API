import z from "zod";
import "dotenv/config";

const trailingSlash: [(v: string) => boolean, string] = [
	(v: string) => {
		return !v.endsWith("/");
	},
	"url should not end with a slash",
];
const envSchema = z.object({
	JWT_SECRET: z.string(),
	BASE_URL: z
		.string()
		.url()
		.refine(...trailingSlash)
		.default("https://api.greasygang.co"),
	CALLBACK_URL: z
		.string()
		.includes("/auth/callback")
		.refine(...trailingSlash)
		.default("https://greasygang.co/auth/callback"),
	DB_NAME: z.string(),
	DB_HOST: z.string().default("localhost"),
	DB_USER: z.string(),
	DB_PASS: z.string(),
	GITHUB_TOKEN: z.string().includes("github_pat_"),
	GITHUB_OWNER: z.string().default("Greasy-Projects"),
	GITHUB_REPO: z.string().default("content"),
	TWITCH_CLIENT_ID: z.string(),
	TWITCH_CLIENT_SECRET: z.string(),
	DISCORD_CLIENT_ID: z.string().regex(/^[0-9]*$/),
	DISCORD_CLIENT_SECRET: z.string(),
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	PORT: z.string().default("4000"),
});

export const env = envSchema.parse(process.env);
export default env;
