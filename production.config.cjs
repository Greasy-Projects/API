// eslint-disable-next-line no-undef
module.exports = {
	apps: [
		{
			name: "GreasyGang Prod API",
			port: 5010,
			script: "pnpm",
			args: "start",
			autorestart: true,
			time: true,
			env: {
				NODE_ENV: "production",
			},
		},
	],
};
