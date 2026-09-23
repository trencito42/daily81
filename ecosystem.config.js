module.exports = {
  apps: [
    {
      name: "daily81",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3007,
      },
      watch: false,
      max_memory_restart: "500M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      time: true,
    },
  ],
};
