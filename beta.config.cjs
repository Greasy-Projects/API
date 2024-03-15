// eslint-disable-next-line no-undef
module.exports = {
	apps: [
		{
			name: "GreasyGang Beta API",
			port: "5011",
			script: "pnpm",
			args: "start",
			autorestart: true,
			env: {
				NODE_ENV: "production",
			},
		},
	],
};
