const Api = require('./api');

module.exports = class Collaborative {
    static insert(payload) {
        return new Promise(function(resolve, reject) {
            Api.postByBody(
                process.env.COLLABORATIVE_URI,
                '/v1/scripts/telegram',
                payload
            ).then(function(result) {
                const datares = (typeof result == 'string') ? JSON.parse(result) : result;
                resolve(datares);
            })
            .catch(function(err) {
                const datares = (typeof err == 'string') ? JSON.parse(err) : err;
                reject(err);
            });
        });
    }

    static getUserByChatId(chat_id) {
        return new Promise(function(resolve, reject) {
            Api.get(
                process.env.COLLABORATIVE_URI,
                `/v1/scripts/telegram/${chat_id}`
            ).then(function(result) {
                const datares = (typeof result == 'string') ? JSON.parse(result) : result;
                resolve(datares);
            })
            .catch(function(err) {
                const datares = (typeof err == 'string') ? JSON.parse(err) : err;
                reject(err);
            });
        });
    }
}