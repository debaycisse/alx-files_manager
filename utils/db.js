const { MongoClient } = require('mongodb');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const URI = `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

class DBClient {
  constructor() {
    this.mongoClient = new MongoClient(URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    this.isConnected = false;

    this.mongoClient
      .connect()
      .then(() => {
        this.isConnected = true;
      })
      .catch(() => {
        this.isConnected = false;
      });
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const dbName = this.mongoClient.db();
      const usersCollection = dbName.collection('users');
      const numOfUsers = usersCollection.countDocuments({});
      return numOfUsers;
    } catch (error) {
      return null;
    }
  }

  async nbFiles() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const dbName = this.mongoClient.db();
      const filesCollection = dbName.collection('files');
      const numOfFiles = filesCollection.countDocuments({});
      return numOfFiles;
    } catch (error) {
      return null;
    }
  }
}
const dbClient = new DBClient();

module.exports = dbClient;
