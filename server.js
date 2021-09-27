const express = require('express');
const bodyParser = require('body-parser')
const routes = require('./route');

// create the server and setup routes
const app = express();
app.use(bodyParser());
app.use(routes);
// run the server locally
module.exports = app;