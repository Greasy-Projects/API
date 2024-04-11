// import { RequestHandler } from "express";
// import { slowDown } from "express-slow-down";

// import { RateLimiterMemory } from "rate-limiter-flexible";

// export const slowDownLimiter = slowDown({
// 	windowMs: 30 * 1000,
// 	delayAfter: 100,
// 	delayMs: hits => hits * 50,
// 	maxDelayMs: 5000,
// });

// const rateLimiter = new RateLimiterMemory({
// 	points: 100, // amount of allowed requests per <duration> seconds
// 	duration: 5,
// 	blockDuration: 10,
// });

// export const rateLimiterMiddleware: RequestHandler = (req, res, next) => {
// 	const token = req.headers.authorization;
// 	rateLimiter
// 		.consume(token ?? req.ip ?? req.ips[0])
// 		.then(() => {
// 			next();
// 		})
// 		.catch(() => {
// 			res.status(429).send("Too Many Requests");
// 		});
// };
