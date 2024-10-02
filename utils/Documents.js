const { ObjectId } = require('mongodb');
const redisClient = require('./redis');
const dbClient = require('./db');

const { mongoClient } = dbClient;
const db = mongoClient.db();
const usersCollection = db.collection('users');
const filesCollection = db.collection('files');
class Documents {
  static async isAvailable(request) {
    const docId = request.params.id;
    const theDocObj = await filesCollection.findOne({
      _id: ObjectId(docId)
    });

    if (!theDocObj) return null;
 
    return theDocObj;
  }

}

module.exports = Documents;
