const Api = require('../lib/api');
const Bot = require('./bot');
const DynamoService = require('../lib/DynamoService');

module.exports = class Check {

    static start(req, res) {
        Promise.all([
            Check.verifyServerDown('appstatus', process.env.API_URL, '/scripts/ping', 'Servidor do AppCollaborative'),
            Check.verifyServerDown('fiscalstatus', process.env.FISCAL_URL, '/scripts/ping', 'Servidor da ApiFiscal'),
            Check.verifyServerDown('deliverystatus', process.env.DELIVERY_URL, '/api/ping', 'Servidor do Delivery'),
            Check.verifyEveryDayEvent('healthcheckstock')
        ])
        .then(function() {
            res.status(200).send({});
        })
        .catch(function() {
            res.status(200).send({});
        });
    }

    static requestHealthCheckStock() {
        return new Promise(function(resolve, reject) {
            Api.get(process.env.API_URL, '/scripts/health/stock')
            .then(function(ret) {

                if(typeof ret == 'string') {
                    ret = JSON.parse(ret);
                }

                if(ret.data && ret.data.length) {
                    var message = 'Existem divergências no estoque:';
                    for(var i = 0; i < ret.data.length; i++) {
                        if(i < 5) {
                            var item = ret.data[i];
                            message += `\n[${item.environment_name}] (${item.product_id}) ${item.product_description} - estoque: ${item.product_stock} real: ${item.product_realstock}`;
                        } else {
                            message += '\n...';
                            break;
                        }
                    }

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

    static canExecuteNow(key) {
        return new Promise(function(resolve, reject) {
            Check.getStatus(key)
            .then(function(status) {
                var datetime = new Date();
                var newstatus = datetime.toISOString().slice(0,10);
                if(newstatus != status) {
                    resolve(true);
                } else {
                    reject(false);
                }
            });
        });
    }

    static canExecuteOnlyFirstDateInYear(key) {
        return new Promise(function(resolve, reject) {
            Check.getStatus(key)
            .then(function(status) {
                var datetime = new Date();
                var newstatus = datetime.toISOString().slice(0,4);
                if(newstatus != status) {
                    resolve(true);
                } else {
                    reject(false);
                }
            });
        });
    }

    static verifyEveryYearEvent(key) {
        return new Promise(function(resolve, reject) {
            console.log('CAN YOU EXECUTE IN THIS YEAR?');
            Check.canExecuteOnlyFirstDateInYear(key)
            .then(function() {
                console.log('YES, YOU CAN');
                // Check.requestHealthCheckStock()
                // .then(function() {
                //     Check.finalizeExecuteTheDay(key)
                //     .then(function() {
                //         resolve(true);
                //     });
                // })
                // .catch(function() {
                //     Check.finalizeExecuteTheDay(key)
                //     .then(function() {
                //         resolve(true);
                //     });
                // });
                resolve(true);
            })
            .catch(function() {
                console.log('NO, YOU CANT');
                resolve(true);
            });
        });
    }

    static verifyEveryDayEvent(key) {
        return new Promise(function(resolve, reject) {
            console.log('CAN EXECUTE NOW?');
            Check.canExecuteNow(key)
            .then(function() {
                console.log('YES, YOU CAN');
                Check.requestHealthCheckStock()
                .then(function() {
                    Check.finalizeExecuteTheDay(key)
                    .then(function() {
                        resolve(true);
                    });
                })
                .catch(function() {
                    Check.finalizeExecuteTheDay(key)
                    .then(function() {
                        resolve(true);
                    });
                });
            })
            .catch(function() {
                console.log('NO, YOU CANT');
                resolve(true);
            });
        });
    }

    static finalizeExecuteTheDay(key) {
        var datetime = new Date();
        var newstatus = datetime.toISOString().slice(0,10);
        return Check.setStatus(key, newstatus)
    }

    static verifyServerDown(key, endpoint, path, service ) {
        return new Promise(function(resolve, reject) {
            Check.getStatus(key)
            .then(function(status) {
                Api.get(endpoint, path)
                .then(function(ret) {
                    if(status == 'down') {
                        Check.setStatus(key, 'up')
                        .then(function(foi) {
                            Bot.sendBroadCastMessage(`${service} voltou a funcionar.`)
                            .then(function() {
                                resolve(true);
                            })
                            .catch(function(err) {
                                console.log('err');
                                resolve(true);
                            });
                        })
                        .catch(function(error) {
                            console.log(error);
                            resolve(true);
                        })
                    } else {
                        resolve(true);
                    }
                })
                .catch(function(err) {
                    if(status == 'up') {
                        Check.setStatus(key, 'down')
                        .then(function(foi) {
                            Bot.sendBroadCastMessage(`${service} caiu.`)
                            .then(function() {
                                resolve(true);
                            })
                            .catch(function(err) {
                                console.log('err');
                                resolve(true);
                            });
                        })
                        .catch(function(error) {
                            console.log(error);
                            resolve(true);
                        })
                    } else {
                        resolve(true);
                    }
                });
            });
        });
    }

    static getStatus(key) {
        return new Promise(function(resolve, reject) {
            DynamoService.getChats()
            .then(function(chats) {
                if(chats.total) {
                    for(var i =0; i < chats.total; i++) {
                        if([key].indexOf(chats.itens[i].id) !== -1) {
                            resolve(chats.itens[i].status);
                            break;
                        }
                    }
                    resolve('up');
                }
            });
        });
    }

    static setStatus(key, value) {
        return new Promise(function(resolve, reject) {
            DynamoService.insert({
                id: key,
                status: value,
                createdAt: (new Date()).toISOString()
            })
            .then(function(result) {
                resolve(result);
            })
            .catch(function(err) {
                reject(err);
            });
        });
    }
}