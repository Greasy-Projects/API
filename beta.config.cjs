module.exports = {
  apps: [
    {
      name: "GreasyGang Beta API",
      port: "5011",
      script: "ts-node",
      args: "src/main.ts",
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
