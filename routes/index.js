import { Router } from 'express';
import AppController from '../controllers/AppController';
import { route } from '../server';
import UsersController from '../controllers/UsersController';

const router = Router();

router.get('/status', (request, response) => {
  AppController.getStatus(request, response);
});

router.get('/stats', (request, response) => {
  AppController.getStats(request, response);
});

router.post('/users', (request, response) => {
  UsersController.postNew(request, response);
});

module.exports = router;
