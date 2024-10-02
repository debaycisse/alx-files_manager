const fs = require('fs').promises;
const uuid = require('uuid');
const path = require('path');
const { ObjectId } = require('mongodb');
const mime = require('mime-types');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');
const UserAuthentication = require('../utils/UserAuthentication');
const Documents = require('../utils/Documents');

const { mongoClient } = dbClient;
const db = mongoClient.db();
const usersCollection = db.collection('users');
const filesCollection = db.collection('files');

class FilesController {
  static postUpload(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;

    redisClient
      .get(key)
      .then((userId) => {
        usersCollection
          .findOne({ _id: new ObjectId(userId) })
          .then((userObj) => {
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
              filesCollection
                .findOne({ _id: new ObjectId(parentId) })
                .then((folderDoc) => {
                  if (!folderDoc) {
                    return response
                      .status(400)
                      .json({ error: 'Parent not found' });
                  }
                  if (folderDoc.type !== 'folder') {
                    return response
                      .status(400)
                      .json({ error: 'Parent is not a folder' });
                  }
                  return null;
                })
                .catch(() => {
                  response.statusCode = 500;
                  return response.json({
                    error:
                      'Internal Server Error - folder\'s existence checking failed in MongoDB',
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
              filesCollection
                .insertOne(folderObj)
                .then((insertedFolderObj) => {
                  response.statusCode = 201;
                  return response.json({
                    id: insertedFolderObj.insertedId,
                    userId: insertedFolderObj.ops[0].userId,
                    name: insertedFolderObj.ops[0].name,
                    type: insertedFolderObj.ops[0].type,
                    isPublic: insertedFolderObj.ops[0].isPublic,
                    parentId: insertedFolderObj.ops[0].parentId,
                  });
                })
                .catch(() => {
                  response.statusCode = 500;
                  return response.json({
                    error:
                      'Internal Server Error - couldn\'t create a new folder document in the DB',
                  });
                });
            } else if (type === 'file' || type === 'image') {
              // Handles other types, such as files and images creation
              const defaultPath = '/tmp/files_manager';
              const localPath = process.env.FOLDER_PATH || defaultPath;
              let fileLocalPath;

              // Check if directory exists and create if it doesn't
              fs.mkdir(localPath, { recursive: true })
                .then(() => {
                  fileLocalPath = path.join(localPath, uuid.v4());
                  const content = Buffer.from(data, 'base64');

                  // Write the file
                  fs.writeFile(fileLocalPath, content)
                    .then(() => {
                      const fileObj = {
                        userId: new ObjectId(userObj._id),
                        name,
                        type,
                        parentId: parentIdObj,
                        isPublic: isPublic || false,
                        localPath: fileLocalPath,
                      };

                      // Insert file record into MongoDB
                      filesCollection
                        .insertOne(fileObj)
                        .then((insertedFileObj) => {
                          response.statusCode = 201;
                          return response.json({
                            id: insertedFileObj.insertedId,
                            userId: insertedFileObj.ops[0].userId,
                            name: insertedFileObj.ops[0].name,
                            type: insertedFileObj.ops[0].type,
                            isPublic: insertedFileObj.ops[0].isPublic,
                            parentId: insertedFileObj.ops[0].parentId,
                          });
                        })
                        .catch(() => {
                          response.statusCode = 500;
                          return response.json({
                            error: 'Internal Server Error',
                          });
                        });
                    })
                    .catch(() => {
                      response.statusCode = 401;
                      return response.json({
                        error: 'Unauthorized',
                      });
                    });
                })
                .catch(() => {
                  response.statusCode = 500;
                  return response.json({
                    error:
                      'Internal Server Error - couldn\'t create a new local path',
                  });
                });
            }
            return null;
          })
          .catch(() => {
            response.statusCode = 401;
            return response.json({ error: 'Unauthorized ' });
          });
      })
      .catch(() => {
        response.statusCode = 500;
        return response.json({
          error: 'Internal Server Error - couldn\'t cache token',
        });
      });
  }

  static getShow(request, response) {
    const documentId = request.params.id || '';
    const token = request.header('X-Token');

    redisClient
      .get(`auth_${token}`)
      .then((userId) => {
        if (!userId) {
          response.statusCode = 401;
          return response.json({
            error: 'Unauthorized',
          });
        }
        usersCollection
          .findOne({ _id: new ObjectId(userId) })
          .then((userFound) => {
            if (!userFound) {
              response.statusCode = 401;
              return response.json({
                error: 'Unauthorized',
              });
            }

            const filtering = {
              _id: new ObjectId(documentId),
              userId: userFound._id,
            };
            filesCollection
              .findOne(filtering)
              .then((foundFile) => {
                if (!foundFile) {
                  response.statusCode = 404;
                  return response.json({
                    error: 'Not found',
                  });
                }
                response.statusCode = 200;
                return response.json({
                  id: foundFile._id,
                  userId: foundFile.userId,
                  name: foundFile.name,
                  type: foundFile.type,
                  isPublic: foundFile.isPublic,
                  parentId: foundFile.parentId,
                });
              })
              .catch(() => {
                response.statusCode = 500;
                return response.json({
                  error:
                    'Internal Server Error - error while retrieving file document',
                });
              });
            return null;
          })
          .catch(() => {
            response.statusCode = 500;
            return response.json({
              error:
                'Internal Server Error - error while retriving user document',
            });
          });
        return null;
      })
      .catch(() => {
        response.statusCode = 500;
        return response.json({
          error:
            'Internal Server Error - Error while retrieving authentication token',
        });
      });
  }

  static getIndex(request, response) {
    const token = request.header('X-Token');
    const { parentId } = request.query;
    const page = request.query.page || 0;
    let parentIdObj = 0;
    if (parentId) parentIdObj = ObjectId(parentId);
    redisClient
      .get(`auth_${token}`)
      .then((userId) => {
        if (!userId) {
          return response.status(401).json({
            error: 'Unauthorized',
          });
        }
        usersCollection
          .findOne({ _id: ObjectId(userId) })
          .then((userFound) => {
            if (!userFound) {
              return response.status(401).json({
                error: 'Unauthorized',
              });
            }
            const maxItems = 20;
            const pipeline = [
              { $match: { parentId: parentIdObj, userId: userFound._id } },
              {
                $project: {
                  id: '$_id', userId: 1, name: 1, type: 1, isPublic: 1, parentId: 1, _id: 0,
                },
              },
              { $limit: maxItems },
              { $skip: page * maxItems },
            ];
            filesCollection.aggregate(pipeline).toArray().then((filesArray) => {
              const reorderedFilesArray = filesArray.map((file) => ({
                id: file.id,
                userId: file.userId,
                name: file.name,
                type: file.type,
                isPublic: file.isPublic,
                parentId: file.parentId,
              }));

              return response.status(200).json(reorderedFilesArray);
            })
              .catch((err) => {
                response.statusCode = 500;
                return response.json({
                  error: 'Internal Server Error',
                  fileAggragateError: err.message,
                });
              });
            return null;
          })
          .catch((err) => {
            response.statusCode = 500;
            return response.json({
              error: 'Internal Server Error',
              userCollectionError: err.message,
            });
          });
        return null;
      })
      .catch((err) => {
        response.statusCode = 500;
        return response.json({
          error: 'Internal Server Error',
          tokenError: err.message,
        });
      });
  }

  static async putPublish(request, response) {
    await UserAuthentication.isValid(request, response);
    const doc = await UserAuthentication.ownsTheDoc(request);

    if (!doc) {
      return response.status(404).json({
        error: 'Not found',
      });
    }
    const filter = {
      _id: ObjectId(doc._id),
      userId: ObjectId(doc.userId),
    };

    const updateDoc = {
      $set: { isPublic: true },
    };

    await filesCollection.updateOne(filter, updateDoc);
    const updatedDoc = await UserAuthentication.ownsTheDoc(request, response);

    return response.status(200).json({
      id: updatedDoc._id,
      userId: updatedDoc.userId,
      name: updatedDoc.name,
      type: updatedDoc.type,
      isPublic: updatedDoc.isPublic,
      parentId: updatedDoc.parentId,
    });
  }

  static async putUnpublish(request, response) {
    await UserAuthentication.isValid(request, response);
    const doc = await UserAuthentication.ownsTheDoc(request);
    const docId = request.params.id;
    const userId = await UserAuthentication.getUser(request, response);

    if (!doc) {
      return response.status(404).json({
        error: 'Not found',
      });
    }

    const filter = {
      _id: ObjectId(docId),
      userId: ObjectId(userId._id),
    };

    const updateDoc = {
      $set: { isPublic: false },
    };

    await filesCollection.updateOne(filter, updateDoc);
    const updatedDoc = await UserAuthentication.ownsTheDoc(request, response);

    return response.status(200).json({
      id: updatedDoc._id,
      userId: updatedDoc.userId,
      name: updatedDoc.name,
      type: updatedDoc.type,
      isPublic: updatedDoc.isPublic,
      parentId: updatedDoc.parentId,
    });
  }

  static async getFile(request, response) {
    const isAvailable = await Documents.isAvailable(request);
    const user = await UserAuthentication.getUser(request);
    const docOwner = await UserAuthentication.ownsTheDoc(request, response);
    if (!isAvailable) {
      return response.status(404).json({
        error: 'Not found',
      });
    }

    if (!isAvailable.isPublic && (!user || !docOwner)) {
      return response.status(404).json({
        error: 'Not found',
      });
    }

    if (isAvailable.type === 'folder') {
      return response.status(400).json({
        error: 'A folder doesn\'t have content',
      });
    }

    if (!isAvailable.localPath) {
      return response.status(404).json({
        error: 'Not found',
      });
    }

    const fileMimeType = mime.lookup(isAvailable.name);
    const fileExtension = mime.extension(fileMimeType);
    const fileContentType = mime.contentType(fileExtension);
    const fileContent = await fs.readFile(isAvailable.localPath, { encoding: 'utf8' });
    response.setHeader('Content-Type', fileContentType);
    return response.send(fileContent);
  }
}

module.exports = FilesController;
