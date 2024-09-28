const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.error('An error occured: ', error);
      this.connectionError = error;
    });
  };

  isAlive() {
    if (this.connectionError) return false;
    else return true;
    // return new Promise((resolve, reject) => {
    //   if (this.connectionError) return false;
    //   else {
    //     this.client.on('connect', () => resolve(true));
    //     this.client.on('error', (error) => resolve(false));
    //   };
    // });
  };

  async get(key) {
    const value = await this.client.get(key);
    return value;
  };

  async set(key, value, durationInSeconds) {
    this.client.setex(key, durationInSeconds, value);
  };

  async del(key) {
    this.client.del(key);
  };

};

const redisClient = new RedisClient();

module.exports = redisClient;
