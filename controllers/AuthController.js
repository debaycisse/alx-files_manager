class AuthController {
  static getConnect(request, response) {
    // should sign-in the user by generating a new authentication token:
    const authHeader = request.header('Authorization');
  }
}

module.exports = AuthController;
