const redis = require('redis');
const util = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.error('An error occured: ', error);
      this.connectionError = error;
    });
    this.asyncGet = util.promisify(this.client.get).bind(this.client);
    this.setAsync = util.promisify(this.client.set).bind(this.client);
    this.setExAsync = util.promisify(this.client.setex).bind(this.client);
    this.asyncDel = util.promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    if (this.connectionError) return false;
    return true;
  }

  async get(key) {
    try {
      return await this.asyncGet(key);
    } catch (error) {
      return null;
    }
  }

  async set(key, value, durationInSeconds) {
    await this.setExAsync(key, durationInSeconds, value);
  }

  async del(key) {
    this.asyncDel(key);
  }
}
const redisClient = new RedisClient();

module.exports = redisClient;
