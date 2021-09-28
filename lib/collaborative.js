const Api = require('./api');

module.exports = class Collaborative {
    static insert(payload) {
        return Api.postByBody(
            process.env.COLLABORATIVE_URI,
            '/v1/telegram',
            payload
        );
    }
}