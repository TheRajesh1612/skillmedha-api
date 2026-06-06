'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient, isRedisAvailable } = require('../cache/redis');
const config = require('../../config');

const limiterOptions = {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
};

if (isRedisAvailable()) {
  limiterOptions.store = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  });
}

const limiter = rateLimit(limiterOptions);

module.exports = { limiter };
