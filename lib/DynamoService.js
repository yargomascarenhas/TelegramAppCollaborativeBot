const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const table = 'TelegramTargoBot';

module.exports = class DynamoService {
    static insert(payload) {
        return new Promise(function(resolve, reject) {
            const payloadInfo = {
                TableName: table,
                Item: payload,
            };
            dynamoDb.put(payloadInfo).promise()
            .then(function(res) {
                resolve(res);
            })
            .catch(function(err) {
                reject(err);
            });
        });
    }

    static getChat(chatId) {
        return new Promise(function(resolve, reject) {
            var params = {
                TableName : 'Table',
                Key: {
                  id: chatId
                }
            };

            dynamoDb.get(params).promise()
            .then(function(res) {
                resolve(res);
            })
            .catch(function(err) {
                resolve(err);
            });
        });
    }

    static getChats() {
        return new Promise(function(resolve, reject) {
            var params = {
                TableName : table
            };
            var results = [];
            var scanNext = function() {
                dynamoDb.scan(params).promise()
                .then(function(res) {
                    if(res.Items) {
                        for(var i=0; i < res.Items.length; i++) {
                            var item = res.Items[i];
                            results.push(item);
                        }
                    }
                    if(res.LastEvaluatedKey) {
                        params['ExclusiveStartKey'] = res.LastEvaluatedKey;
                        scanNext();
                    } else {
                        var itens = [];
                        if(results.length > 16000) {
                            for(var i=0; i < results.length; i++) {
                                var item = results[i];
                                itens.push(item);
                            }
                        } else {
                            itens = results;
                        }
                        resolve({
                            total: results.length,
                            itens: itens
                        });
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
            };
            scanNext();
        });
    }
}