const { Router } = require('express');
const Bot = require('./src/bot');
const Check = require('./src/check');
const routes = Router();

routes.all('/bot', Bot.hook);
routes.get('/', Check.start);
routes.post('/notify', Bot.notify);
module.exports = routes;