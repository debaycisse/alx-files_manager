const { ObjectId } = require('mongodb');
const redisClient = require('./redis');
const dbClient = require('./db');

const { mongoClient } = dbClient;
const db = mongoClient.db();
const usersCollection = db.collection('users');
const filesCollection = db.collection('files');
class UserAuthentication {
  static async isValid(request, response) {
    const token = request.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    const userFound = await usersCollection.findOne({
      _id: ObjectId(userId),
    });

    if (!userFound) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    return null;
  }

  static async getUser(request) {
    try {
      const token = request.header('X-Token');
      const userId = await redisClient.get(`auth_${token}`);
      const userFound = await usersCollection.findOne({
        _id: ObjectId(userId),
      });

      return userFound;
    } catch (err) {
      return null;
    }
  }

  static async ownsTheDoc(request) {
    const userObj = await this.getUser(request);
    let userId;
    try {
      userId = ObjectId(userObj._id);
    } catch (err) {
      userId = '';
    }
    const docId = request.params.id;
    const doc = await filesCollection.findOne({
      _id: ObjectId(docId), userId,
    });

    if (doc) return doc;
    return null;
  }
}

module.exports = UserAuthentication;
