const Api = require('../lib/api');
const Bot = require('./bot');

module.exports = class Inventory {
    static execute() {
        return new Promise(function(resolve, reject) {
            // consultar as companies que possuem modulo fiscal ativo
            Api.get(process.env.API_URL, '/scripts/health/stock')
            .then(function(ret) {

                if(typeof ret == 'string') {
                    ret = JSON.parse(ret);
                }

                if(ret.data && ret.data.length) {
                    var message = 'Existem divergências no estoque:';

                    // iterar as companies chamando um novo endpoint que vai gerar o csv e enviar por email e distribuir o link no telegram.

                    console.log(message);
                    Bot.sendBroadCastMessage(message)
                    .then(function() {
                        resolve(true);
                    })
                    .catch(function(err) {
                        console.log('err', err);
                        resolve(true);
                    });
                } else {
                    resolve(ret);
                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            });
        });
    }
}