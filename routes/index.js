import { Router } from 'express';
import AppController from '../controllers/AppController';

const router = Router();

router.get('/status', (request, response) => {
  AppController.getStatus(request, response);
});

router.get('/stats', (request, response) => {
  AppController.getStats(request, response);
});

module.exports = router;
