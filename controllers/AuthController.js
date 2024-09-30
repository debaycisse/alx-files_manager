const sha1 = require('sha1');
const uuid = require('uuid');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AuthController {
  static getConnect(request, response) {
    const authHeader = request.header('Authorization').split(' ')[1];
    const userCred = Buffer.from(authHeader, 'base64').toString('utf-8');
    const email = userCred.split(':')[0];
    const password = userCred.split(':')[1];
    const db = dbClient.mongoClient.db();
    db.collection('users').findOne({ email })
      .then((result) => {
        if (!result) {
          response.statusCode = 401;
          return response.json({ error: 'Unauthorized' });
        }
        const hashedPassword = sha1(password);
        if (hashedPassword !== result.password) {
          response.statusCode = 401;
          return response.json({ error: 'Unauthorized' });
        }
        const token = uuid.v4();
        const key = `auth_${token}`;
        redisClient.set(key, String(result._id), 60 * 60 * 24)
          .then(() => {
            response.statusCode = 200;
            response.setHeader('X-Token', token);
            return response.json({ token });
          });
        return null;
      });
  }

  static getDisconnect(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    redisClient.get(key)
      .then((userId) => {
        const db = dbClient.mongoClient.db();
        const usersCollection = db.collection('users');
        usersCollection.findOne({ _id: new ObjectId(userId) })
          .then((userObj) => {
            if (!userObj) {
              response.statusCode = 401;
              return response.json({ error: 'Unauthorized' });
            }
            redisClient.del(key)
              .then(() => {
                response.statusCode = 204;
                return null;
              })
              .catch((err) => {
                console.error('Error occured. Couldn\'t delete session token :', err.message);
                return null;
              });
            return null;
          });
      })
      .catch(() => {
        response.statusCode = 401;
        return response.json({ error: 'Unauthorized' });
      });
  }

  static getMe(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    redisClient.get(key)
      .then((userId) => {
        const db = dbClient.mongoClient.db();
        const usersCollection = db.collection('users');
        usersCollection.findOne({ _id: new ObjectId(userId) })
          .then((userObj) => {
            if (!userObj) {
              response.statusCode = 401;
              return response.json({ error: 'Unauthorized' });
            }
            response.statusCode = 200;
            return response.json({ id: userObj._id, email: userObj.email });
          });
      })
      .catch(() => {
        response.statusCode = 401;
        return response.json({ error: 'Unauthorized' });
      });
  }
}

module.exports = AuthController;
