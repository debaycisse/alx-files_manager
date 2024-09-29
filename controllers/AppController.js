const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AppController {
  static getStatus(request, response) {
    let redisStatus = false;
    let dbStatus = false;
    if (redisClient.isAlive()) {
      redisStatus = true;
    }
    if (dbClient.isAlive()) {
      dbStatus = true;
    }
    response.statusCode = 200;
    response.json({ redis: redisStatus, db: dbStatus });
  }

  static getStats(request, response) {
    let numOfUserDoc = 0;
    let numOfFileDoc = 0;
    dbClient.nbUsers()
      .then((value) => {
        numOfUserDoc = value;
      })
      .catch(() => {
        numOfUserDoc = null;
      });
    dbClient.nbFiles()
      .then((value) => {
        numOfFileDoc = value;
      })
      .catch(() => {
        numOfFileDoc = null;
      });
    response.statusCode = 200;
    response.json({ users: numOfUserDoc, files: numOfFileDoc });
  }
}

module.exports = AppController;
