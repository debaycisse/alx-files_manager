const { ObjectId } = require('mongodb');
const dbClient = require('./db');

const { mongoClient } = dbClient;
const db = mongoClient.db();
const filesCollection = db.collection('files');

class Documents {
  static async isAvailable(request) {
    const docId = request.params.id;
    const theDocObj = await filesCollection.findOne({
      _id: ObjectId(docId),
    });

    if (!theDocObj) return null;

    return theDocObj;
  }

  static async findDoc(DocId, userId) {
    try {
      const filter = {
        _id: ObjectId(DocId),
        userId: ObjectId(userId),
      };
      const DocObj = await filesCollection.findOne(filter);

      if (DocObj) return DocObj;
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = Documents;
