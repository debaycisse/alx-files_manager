class FilesController {
  static postUpload(request, response) {
    //  should create a new file in DB and in disk:
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    redisClient
      .get(key)
      .then((userId) => {
        const db = dbClient.mongoClient.db();
        const usersCollection = db.collection('users');
        const filesCollection = db.collection('files');
        usersCollection
          .findOne({ _id: new ObjectId(userId) })
          .then((userObj) => {
            if (!userObj) {
              response.statusCode = 401;
              return response.json({ error: 'Unauthorized' });
            }
            // Implementation starts here
            const { name, type, parentId, isPublic, data } = request.body;
            if (!name) {
              response.statusCode = 400;
              return response.json({ error: 'Missing name' });
            }
            const supportedTypes = ['file', 'image', 'folder'];
            if (!type || !supportedTypes.includes(type)) {
              response.statusCode = 400;
              return response.json({ error: 'Missing type' });
            }
            if (!data && type !== 'folder') {
              response.statusCode = 400;
              return response.json({ error: 'Missing data' });
            }
            if (parentId) {
              filesCollection.findOne({ parentId }).then((fileDoc) => {
                if (!fileDoc) {
                  response.statusCode = 400;
                  return response.json({ error: 'Parent not found' });
                }
                if (fileDoc.type !== 'folder') {
                  response.statusCode = 400;
                  return response.json({ error: 'Parent is not a folder' });
                }
              });
            }
            if (type === folder) {
              const folderObj = {
                userId: userObj._id,
                name,
                type,
                parentId: parentId || 0,
              };
              filesCollection.insertOne(folderObj).then((insertedFileObj) => {
                response.statusCode = 201;
                return response.json({
                  id: insertedFileObj._id,
                  userId: insertedFileObj.userId,
                  name: insertedFileObj.name,
                  type: insertedFileObj.type,
                  parentId: insertedFileObj.parentId,
                });
              });
            }
            // Implementatio -> when type is not folder (i.e file or image)
            const defaultPath = '/tmp/files_manager';
            const localPath = process.env.FOLDER_PATH || defaultPath;
            
          });
      })
      .catch(() => {
        response.statusCode = 401;
        return response.json({ error: 'Unauthorized' });
      });
  }
}

module.exports = FilesController;
