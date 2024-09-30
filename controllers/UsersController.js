const sha1 = require('sha1');
const dbClient = require('../utils/db');

class UsersController {
  static postNew(request, response) {
    try {
      const { email, password } = request.body;
      const db = dbClient.mongoClient.db();
      const usersCollection = db.collection('users');
      if (!email) {
        response.statusCode = 400;
        return response.json({ error: 'Missing email' });
      }
      if (!password) {
        response.statusCode = 400;
        return response.json({ error: 'Missing password' });
      }
      usersCollection.findOne({ email })
        .then((result) => {
          if (result) {
            response.statusCode = 400;
            return response.json({ error: 'Already exist' });
          }
          const hashedPassword = sha1(password);
          const userObj = { email, password: hashedPassword };
          usersCollection.insertOne(userObj)
            .then((result) => {
              response.statusCode = 201;
              return response.json({ id: result.insertedId, email: userObj.email });
            })
            .catch(() => {
              response.statusCode = 500;
              return response.json({ error: 'Data coundn\'t be added to the database' });
            });
          return null;
        });
    } catch (error) {
      response.statusCode = 500;
      return response.json({ error: 'Internal Server Error' });
    }
    return null;
  }
}

module.exports = UsersController;
