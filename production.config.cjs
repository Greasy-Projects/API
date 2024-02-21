module.exports = {
  apps: [
    {
      name: "GreasyGang Prod API",
      port: "5010",
      script: "pnpm",
      args: "start",
      autorestart: true,
      env: {
        NODE_ENV: "production", // Set the NODE_ENV environment variable to production
      },
    },
  ],
};
