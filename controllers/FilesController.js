const fs = require('fs').promises;
const uuid = require('uuid');
const path = require('path');
const { ObjectId } = require('mongodb');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static postUpload(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;

    redisClient.get(key).then((userId) => {
      const db = dbClient.mongoClient.db();
      const usersCollection = db.collection('users');
      const filesCollection = db.collection('files');

      usersCollection.findOne({ _id: new ObjectId(userId) }).then((userObj) => {
        if (!userObj) {
          return response.status(401).json({ error: 'Unauthorized' });
        }

        const {
          name, type, parentId, isPublic, data,
        } = request.body;
        if (!name) {
          return response.status(400).json({ error: 'Missing name' });
        }

        const supportedTypes = ['file', 'image', 'folder'];
        if (!type || !supportedTypes.includes(type)) {
          return response.status(400).json({ error: 'Missing type' });
        }

        if (!data && type !== 'folder') {
          return response.status(400).json({ error: 'Missing data' });
        }

        if (parentId) {
          filesCollection.findOne({ _id: new ObjectId(parentId) }).then((folderDoc) => {
            if (!folderDoc) {
              return response.status(400).json({ error: 'Parent not found' });
            }
            if (folderDoc.type !== 'folder') {
              return response.status(400).json({ error: 'Parent is not a folder' });
            }
            return null;
          }).catch(() => {
            response.statusCode = 500;
            return response.json({
              error: 'Internal Server Error - folder\'s existence checking failed in MongoDB',
            });
          });
        }

        let parentIdObj = 0;
        if (parentId) parentIdObj = new ObjectId(parentId);

        // Handles folder creation
        if (type === 'folder') {
          const folderObj = {
            userId: new ObjectId(userObj._id),
            name,
            type,
            parentId: parentIdObj,
            isPublic: isPublic || false,
          };
          filesCollection.insertOne(folderObj).then((insertedFolderObj) => {
            response.statusCode = 201;
            return response.json({
              id: insertedFolderObj.insertedId,
              userId: insertedFolderObj.ops[0].userId,
              name: insertedFolderObj.ops[0].name,
              type: insertedFolderObj.ops[0].type,
              isPublic: insertedFolderObj.ops[0].isPublic,
              parentId: insertedFolderObj.ops[0].parentId,
            });
          }).catch(() => {
            response.statusCode = 500;
            return response.json({
              error: 'Internal Server Error - couldn\'t create a new folder document in the DB',
            });
          });
        } else if (type === 'file' || type === 'image') {
          // Handles other types, such as files and images creation
          const defaultPath = '/tmp/files_manager';
          const localPath = process.env.FOLDER_PATH || defaultPath;
          let fileLocalPath;

          // Check if directory exists and create if it doesn't
          fs.mkdir(localPath, { recursive: true }).then(() => {
            fileLocalPath = path.join(localPath, uuid.v4());
            const content = Buffer.from(data, 'base64');

            // Write the file
            fs.writeFile(fileLocalPath, content).then(() => {
              const fileObj = {
                userId: new ObjectId(userObj._id),
                name,
                type,
                parentId: parentIdObj,
                isPublic: isPublic || false,
                localPath: fileLocalPath,
              };

              // Insert file record into MongoDB
              filesCollection.insertOne(fileObj).then((insertedFileObj) => {
                response.statusCode = 201;
                return response.json({
                  id: insertedFileObj.insertedId,
                  userId: insertedFileObj.ops[0].userId,
                  name: insertedFileObj.ops[0].name,
                  type: insertedFileObj.ops[0].type,
                  isPublic: insertedFileObj.ops[0].isPublic,
                  parentId: insertedFileObj.ops[0].parentId,
                });
              }).catch(() => {
                response.statusCode = 500;
                return response.json({
                  error: 'Internal Server Error',
                });
              });
            }).catch(() => {
              response.statusCode = 401;
              return response.json({
                error: 'Unauthorized',
              });
            });
          }).catch(() => {
            response.statusCode = 500;
            return response.json({
              error: 'Internal Server Error - couldn\'t create a new local path',
            });
          });
        }
        return null;
      }).catch(() => {
        response.statusCode = 401;
        return response.json({ error: 'Unauthorized ' });
      });
    }).catch(() => {
      response.statusCode = 500;
      return response.json({ error: 'Internal Server Error - couldn\'t cache token' });
    });
  }
}

module.exports = FilesController;
