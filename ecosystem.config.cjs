module.exports = {
  apps: [
    {
      name: 'auction-calculator',
      script: '/home/user/webapp/.next/standalone/server.js',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
