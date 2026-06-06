module.exports = {
  apps: [
    {
      name:         'skillmedha-api',
      script:       'src/app.js',
      instances:    'max',
      exec_mode:    'cluster',
      watch:        false,
      max_memory_restart: '1G',
      env_development: {
        NODE_ENV: 'dev',
      },
      env_qa: {
        NODE_ENV: 'qa',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name:   'skillmedha-socket',
      script: 'src/modules/tpo/services/socket.service.js',
      watch:  false,
      env_development: { NODE_ENV: 'dev' },
      env_production:  { NODE_ENV: 'production' },
    },
    {
      name:   'skillmedha-jobsocket',
      script: 'src/modules/tpo/services/jobSocket.service.js',
      watch:  false,
      env_development: { NODE_ENV: 'dev' },
      env_production:  { NODE_ENV: 'production' },
    },
  ],
};
