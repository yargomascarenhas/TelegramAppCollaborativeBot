const Api = require('../lib/api');
const Bot = require('./bot');

module.exports = class Inventory {
    static send(req, res) {
        console.log(req.body);
        res.status(200).send({});
    }
}