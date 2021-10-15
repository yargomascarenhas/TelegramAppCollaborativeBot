const Collaborative = require('../lib/collaborative');
const Api = require('../lib/api');
const { response } = require('express');

module.exports = class Bot {
    static hook(req, res) {
        if(Bot.haveMessageText(req)) {
            if(Bot.isAKey(req))
                Bot.processKey(req, res);
            else
                Bot.verifyIdentity(req, res);
        } else {
            res.status(200).send({});
        }
    }

    static sendMessage(chat_id, message) {
        return new Promise(function(resolve, reject) {
            Api.postByBody(
                process.env.TELEGRAMBOT_URI,
                '/sendMessage',
            {
                chat_id: chat_id,
                text: message
            })
            .then(function(result) {
                resolve(result);
            })
            .catch(function(error) {
                reject(error);
            });
        });
    }

    static consulta(chat_id, query) {
        return new Promise(function(resolve, reject) {
            Collaborative.getAuthToken(chat_id)
            .then(res => {
                if(res.token) {
                    Collaborative.queryAuth(query, res.token)
                    .then(resd => {
                        resolve(resd);
                    })
                    .catch(errd => {
                        reject(errd);
                    });
                } else {
                    if(res.message == 'MORE_THAN_ONE_ENVIRONMENT_ACCESS') {
                        let message = 'Você deseja trocar para qual loja? digite:';
                        for(let loja of res.environments) {
                            message += `\nloja ${loja.name} (para trocar para a ${loja.name})`;
                        }
                        Bot.sendMessage(chat_id,
                        message)
                        .then(res => resolve(res))
                        .catch(err => resolve(err));
                    } else {
                        resolve(res);
                    }
                }
            })
            .catch(err => {
                console.log('ERR NAO RETORNOU TOKEN, RETORNOU:')
                reject(err);
            });
        });
    }

    static sendMessageMarkdown(chat_id, message) {
        return new Promise(function(resolve, reject) {
            console.log('sendMessageMarkdown');
            Api.postByBody(
                process.env.TELEGRAMBOT_URI,
                '/sendMessage',
            {
                chat_id: chat_id,
                text: message,
                parse_mode: 'MarkdownV2',
                disable_web_page_preview: true
            })
            .then(function(result) {
                console.log('RESULT', result);
                resolve(result);
            })
            .catch(function(error) {
                console.log('ERROR', error);
                reject(error);
            });
        });
    }

    static isAKey(req) {
        const messagetext = req.body.message.text;
        return ((messagetext.toUpperCase().indexOf('DEF') !== -1
            || messagetext.toUpperCase().indexOf('PAR') !== -1)
            && messagetext.length === 11);
    }

    static haveMessageText(req) {
        return (req.body.message && req.body.message.text);
    }

    static processKey(req, res) {
        var payload = Object.assign({}, req.body.message);
        Collaborative.insert(payload)
        .then(function(datares) {
            if(datares.data && datares.data.id) {
                Bot.sendRegisterMessage(datares.data)
                .then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            } else if(datares.error && datares.error.message && datares.error.message == 'TELEGRAM_IN_USE_KEY') {
                Bot.sendMessage(req.body.message.chat.id,
                    'Sua conta telegram já está vinculada a uma chave, não é possível vincular uma nova chave a este telegram')
                .then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            } else {
                Bot.sendInvalidKeyMessage(req.body.message.chat.id)
                .then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            }
        })
        .catch(function(err) {
            Bot.sendServerFailMessage(req)
            .then(function() {res.status(200).send({})})
            .catch(function() {res.status(200).send({})});
        });
    }

    static sendRegisterMessage(data) {
        return Bot.sendMessage(
            data.telegram_id,
            `Tudo certo ${data.data.first_name}. Agora você está inscrita(o) para receber as notificações da loja ${data.environment.name}!`
        );
    }

    static sendInvalidKeyMessage(chat_id) {
        return Bot.sendMessage(
            chat_id,
            `Hummm... esse código que você informou é inválido`
        );
    }

    static sendServerFailMessage(req) {
        return Bot.sendMessage(
            req.body.message.chat.id,
            'Olha, eu estou um pouco atarefada agora, fala comigo daqui a 1 minuto que te ajudo.'
        );
    }

    static verifyIdentity(req, res) {
        Collaborative.getUserByChatId(req.body.message.chat.id)
        .then(function(datares) {
            if(datares.data && datares.data.id) {
                Bot.processConversation(req, datares)
                .then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            } else {
                Bot.sendMessage(
                    req.body.message.chat.id,
                    'Olá, eu ainda não te conheço. Por favor, digite a sua chave do AppCollaborative.'
                ).then(function() {res.status(200).send({})})
                .catch(function() {res.status(200).send({})});
            }
        })
        .catch(function(err) {
            console.log('ERR', err);
            Bot.sendServerFailMessage(req)
            .then(function(result) {res.status(200).send({})})
            .catch(function(result) {res.status(200).send({})});
        });
    }

    static setarLojaPreferencia(datares, chat_id, envid) {
        return new Promise((resolve, reject) => {
            console.log('setarLojaPreferencia', envid);
            Collaborative.updateEnvironment(chat_id, {
                environment_id: envid,
                partneruser_id: datares.data.partneruser_id
            })
            .then(function(datares) {
                if(datares.id) {
                    resolve(datares);
                } else {
                    reject(datares);
                }
            })
            .catch(err => reject(err));
        });
    }

    static msgContains(message, text) {
        return (message.toUpperCase().indexOf(text) !== -1);
    }

    static isDefault(datares) {
        return datares.data.user.type === 'USER';
    }

    static isPartner(datares) {
        return datares.data.user.type === 'PARTNER';
    }

    static respostaDireta(messagetext) {
        console.log('respostaDireta');
        let response = '';
        if(Bot.msgContains(messagetext, 'OI') ||
            Bot.msgContains(messagetext, '/START')) {
            response = `Oi, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'OLÁ') ||
            Bot.msgContains(messagetext, 'OLA')) {
            response = `Olá, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'BOM DIA')) {
            response = `Bom dia, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'BOA TARDE')) {
            response = `Boa tarde, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'BOA NOITE')) {
            response = `Boa noite, como posso ajudar?`;
        }
        if(Bot.msgContains(messagetext, 'OBRIGAD')) {
            response = `Nada, eu que agradeço!`;
        }
        if(Bot.msgContains(messagetext, 'OK')) {
            response = `Ok!`;
        }
        if((Bot.msgContains(messagetext, 'TUDO')
            || Bot.msgContains(messagetext, 'TD'))
            && (Bot.msgContains(messagetext, 'VC?')
            || Bot.msgContains(messagetext, 'VOCE?')
            || Bot.msgContains(messagetext, 'VOCÊ?')
            || Bot.msgContains(messagetext, 'TU?')
            || Bot.msgContains(messagetext, 'VAI?')
            || Bot.msgContains(messagetext, 'BEM')
            || Bot.msgContains(messagetext, 'ESTA?')
            || Bot.msgContains(messagetext, 'CONTIGO?'))) {
            response = `Estou bem, obrigada por perguntar. Como posso ajudar?`;
        }
        if((Bot.msgContains(messagetext, 'TUDO')
            || Bot.msgContains(messagetext, 'TD'))
            && !(Bot.msgContains(messagetext, 'VC?')
            || Bot.msgContains(messagetext, 'VOCE?')
            || Bot.msgContains(messagetext, 'VOCÊ?')
            || Bot.msgContains(messagetext, 'TU?')
            || Bot.msgContains(messagetext, 'VAI?')
            || Bot.msgContains(messagetext, 'ESTA?')
            || Bot.msgContains(messagetext, 'CONTIGO?'))) {
            response = `Estou bem, obrigada por perguntar. Como posso ajudar?`;
        }
        return response;
    }

    static conversaFiada(messagetext) {
        console.log('conversaFiada');
        let response = '';
        if(Bot.msgContains(messagetext, 'PODE SIM') ||
            Bot.msgContains(messagetext, 'ESPERO QUE SIM')) {
            response = `Que legal! me fala sua dúvida`;
        }
        if(Bot.msgContains(messagetext, 'QUE MARAVILHA') ||
            Bot.msgContains(messagetext, 'QUE ÓTIMO') ||
            Bot.msgContains(messagetext, 'QUE OTIMO') ||
            Bot.msgContains(messagetext, 'QUE BACANA') ||
            Bot.msgContains(messagetext, 'GENIAL') ||
            Bot.msgContains(messagetext, 'MARAVILH') ||
            Bot.msgContains(messagetext, 'QUE BOM')) {
            response = `Obrigada! fico muito feliz que você tenha gostado`;
        }
        if(Bot.msgContains(messagetext, 'CERTO')
            && Bot.msgStartWith(messagetext, 'CERTO')) {
            response = `certinho`;
        }
        return response;
    }

    static intencaoDuvida(datares, chat_id, messagetext) {
        console.log('intencaoDuvida');
        let response = '';

        if(Bot.isDefault(datares)) {
            if(Bot.msgContains(messagetext, 'CHECKIN') ||
                Bot.msgContains(messagetext, 'CHECK-IN')) {
                if(Bot.msgContains(messagetext, 'FAZER') ||
                    Bot.msgContains(messagetext, 'EFETUAR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'FAZ')) {
                    response = 'A marca faz o Check\\-in através do acesso dela na plataforma, e quando o check\\-in é finalizado, fica disponível para você conferir os itens, aceitar ou negar\\. [Saiba mais](https://youtu.be/20Ff4DdA05U)';
                }
                if(Bot.msgContains(messagetext, 'ACEITAR') ||
                    Bot.msgContains(messagetext, 'ACEIT') ||
                    Bot.msgContains(messagetext, 'NEGAR') ||
                    Bot.msgContains(messagetext, 'NEGO') ||
                    Bot.msgContains(messagetext, 'NEGA')) {
                    response = 'Você pode aceitar ou negar um Check\\-in, através do menu \\-\\> Parceiros \\-\\> Solicitações \\-\\> clique sobre o Check\\-in desejado\\. [Saiba mais](https://youtu.be/\\-mrOK7_Q8IQ)';
                }
                if(Bot.msgContains(messagetext, 'ETIQUETA')) {
                    response = 'Você pode imprimir etiquetas em qualquer tipo de impressora utilizando o AppCollaborative, lembre\\-se sempre de utilizar o Google Chrome. Para mais detalhes preparamos esse video que ensina como configurar e imprimir: [Etiquetas](https://youtu.be/uBjCMwXFRJI)';
                }
            }
            if(Bot.msgContains(messagetext, 'CHECKOUT') ||
                Bot.msgContains(messagetext, 'CHECK-OUT')) {
                if(Bot.msgContains(messagetext, 'FAZER') ||
                    Bot.msgContains(messagetext, 'EFETUAR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'FAZ')) {
                    response = 'A marca faz o Check\\-out através do acesso dela na plataforma, e quando o check\\-out é finalizado fica disponível para você aceitar ou negar\\. [Saiba mais](https://youtu.be/3_9_ceZ5nWU)';
                }
                if(Bot.msgContains(messagetext, 'ACEITAR') ||
                    Bot.msgContains(messagetext, 'ACEITA') ||
                    Bot.msgContains(messagetext, 'ACEITO') ||
                    Bot.msgContains(messagetext, 'NEGAR') ||
                    Bot.msgContains(messagetext, 'NEGO') ||
                    Bot.msgContains(messagetext, 'NEGA')) {
                    response = 'Você pode aceitar ou negar um Check\\-out, através do menu \\-\\> Parceiros \\-\\> Solicitações \\-\\> clique sobre o Check\\-out desejado\\. [Saiba mais](https://youtu.be/3_9_ceZ5nWU)';
                }
            }
            if(Bot.msgContains(messagetext, 'ETIQUETA')) {
                response = 'Você pode imprimir etiquetas em qualquer tipo de impressora utilizando o AppCollaborative, lembre\\-se sempre de utilizar o Google Chrome, para mais detalhes preparamos esse video que ensina como configurar e imprimir: [Etiquetas](https://youtu.be/uBjCMwXFRJI)';
            }
            if(Bot.msgContains(messagetext, 'PRODUTO')) {
                if(Bot.msgContains(messagetext, 'CADASTR') ||
                    Bot.msgContains(messagetext, 'SALV') ||
                    Bot.msgContains(messagetext, 'EDIT') ||
                    Bot.msgContains(messagetext, 'MUD')
                ) {
                    response = 'Você, como lojista, pode cadastrar um novo produto, editar ou deletar direto no menu \\-\\> Produtos \\-\\> Produtos, a Marca consegue inserir e editar produtos através de solicitações';
                }
                if(Bot.msgContains(messagetext, 'DESCONTO')) {
                    response = 'Você pode cadastrar um desconto direto no produto e assim toda vez que ele for adicionado na venda já entrará com o valor do desconto, esse desconto também será exibido no e\\-commerce\\.';
                }
                if(Bot.msgContains(messagetext, 'CUSTO')) {
                    response = 'Tanto você quanto a marca podem cadastrar o preço de custo no produto, e depois apurar os produtos vendidos pelo preço de custo no relatório de vendas, marcando a opção de visualização com preço de custo\\.';
                }
                if(Bot.msgContains(messagetext, 'MARKUP') ||
                    Bot.msgContains(messagetext, 'COMISSAO')) {
                    response = 'Por padrão o sistema considera o cálculo de comissão com base na porcentagem informada no campo de markup no cadastro do Parceiro, você pode informar o markup em porcentagem de um produto específico, dessa forma o calculo será prioritariamente com base no cadastro do produto\\.';
                }
                if(Bot.msgContains(messagetext, 'FOTO')) {
                    response = 'Você pode cadastrar uma foto por produto, dependendo do tema utilizado é possível adicionar até três fotos por produto\\.';
                }
            }
            if(Bot.msgContains(messagetext, 'VENDA')) {
                if(Bot.msgContains(messagetext, 'FAZ') ||
                    Bot.msgContains(messagetext, 'CADASTR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'EFETUA') ||
                    Bot.msgContains(messagetext, 'PAGA')) {
                    response = 'preparamos um vídeo que vai te ajudar a entender mais sobre as vendas, segue: [Video](https://youtu.be/PMYwO0bIwgk)';
                }
                if(Bot.msgContains(messagetext, 'APAGA') ||
                    Bot.msgContains(messagetext, 'DELETA')) {
                    response = 'preparamos um vídeo que mostra como deletar uma venda, segue: [Video](https://youtu.be/YRnrEKDAhtk)';
                }
            }
            if(Bot.msgContains(messagetext, 'EXTRATO') ||
                Bot.msgContains(messagetext, 'COMISSAO')) {
                response = 'preparamos um vídeo que vai te ajudar a entender como funciona as comissões e extratos no AppCollaborative, segue: [Video](https://youtu.be/EWLcnQnaQcc)';
            }
            if(Bot.msgContains(messagetext, 'TROCA') ||
                Bot.msgContains(messagetext, 'DEVOLUCAO') ||
                Bot.msgContains(messagetext, 'DEVOLVE')) {
                response = 'preparamos um vídeo que vai te ajudar a entender como funciona as trocas e devoluções, segue: [Video](https://youtu.be/YSgg6DY98N0)';
            }
            if(Bot.msgContains(messagetext, 'ECOMMERCE') ||
                Bot.msgContains(messagetext, 'E-COMMERCE') ||
                Bot.msgContains(messagetext, 'SITE') ||
                Bot.msgContains(messagetext, 'DELIVERY')) {
                if(Bot.msgContains(messagetext, 'CRIA') ||
                    Bot.msgContains(messagetext, 'CRIO') ||
                    Bot.msgContains(messagetext, 'FAZ') ||
                    Bot.msgContains(messagetext, 'FAÇ')) {
                    response = 'para criar o e\\-commerce no AppCollaborative é necessário ativar o Módulo do Delivery, na sessão de módulos que fica no botão com 9 pontos no canto direito superior da tela\\.';
                }
                if(Bot.msgContains(messagetext, 'PAGAMENTO') ||
                    Bot.msgContains(messagetext, 'PAGSEGURO') ||
                    Bot.msgContains(messagetext, 'PAGAR') ||
                    Bot.msgContains(messagetext, 'RECEB')) {
                    response = 'no e\\-commerce do AppCollaborative é possível receber pagamentos de forma integrada com o PagSeguro e com o Pagar\\.me';
                }
                if(Bot.msgContains(messagetext, 'ENTREGA') ||
                    Bot.msgContains(messagetext, 'ENVIO') ||
                    Bot.msgContains(messagetext, 'ENVIA') ||
                    Bot.msgContains(messagetext, 'MELHORENVIO') ||
                    Bot.msgContains(messagetext, 'MELHOR ENVIO') ||
                    Bot.msgContains(messagetext, 'SEDEX') ||
                    Bot.msgContains(messagetext, 'PAC') ||
                    Bot.msgContains(messagetext, 'JADLOG') ||
                    Bot.msgContains(messagetext, 'CORREIO')) {
                    response = 'o e\\-commerce do AppCollaborative possui integração com os Correios e com o Melhor Envio para cotação de fretes, com o Melhor Envio ainda é possível gerar a etiqueta direto do pedido.';
                }
            }
            if(Bot.msgContains(messagetext, 'FISCAL') ||
                Bot.msgContains(messagetext, 'NOTA') ||
                Bot.msgContains(messagetext, 'NF')) {

            }
            if(Bot.msgContains(messagetext, 'USUARIO') ||
                Bot.msgContains(messagetext, 'FUNCIONARIO') ||
                Bot.msgContains(messagetext, 'SOCIO') ||
                Bot.msgContains(messagetext, 'ADMINISTRADOR') ||
                Bot.msgContains(messagetext, 'VENDEDOR')) {

            }
            if(Bot.msgContains(messagetext, 'PARCEIRO') ||
                Bot.msgContains(messagetext, 'MARCA') ||
                Bot.msgContains(messagetext, 'ARTESÃO') ||
                Bot.msgContains(messagetext, 'COLABORADOR')) {
                if(Bot.msgContains(messagetext, 'CADASTR') ||
                    Bot.msgContains(messagetext, 'SALV') ||
                    Bot.msgContains(messagetext, 'EDIT') ||
                    Bot.msgContains(messagetext, 'CRI') ||
                    Bot.msgContains(messagetext, 'MUD')
                ) {
                    response = 'Você como lojista pode cadastrar um novo parceiro, editar e deletar direto no menu \\-\\> Parceiros \\-\\> Parceiros';
                }
            }
        }
        if(Bot.isPartner(datares)) {
            if(Bot.msgContains(messagetext, 'CHECKIN') ||
                Bot.msgContains(messagetext, 'CHECK-IN')) {
                if(Bot.msgContains(messagetext, 'FAZER') ||
                    Bot.msgContains(messagetext, 'EFETUAR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'FAZ')) {
                    response = 'Você pode fazer o Check\\-in através do seu acesso na plataforma, e quando o check\\-in é finalizado fica disponível para o lojista conferir os itens, aceitar ou negar\\. [Saiba mais](https://youtu.be/20Ff4DdA05U)';
                }
                if(Bot.msgContains(messagetext, 'ACEITAR') ||
                    Bot.msgContains(messagetext, 'ACEIT') ||
                    Bot.msgContains(messagetext, 'NEGAR') ||
                    Bot.msgContains(messagetext, 'NEGO') ||
                    Bot.msgContains(messagetext, 'NEGA')) {
                    response = 'O lojista pode aceitar ou negar um Check\\-in, através do menu \\-\\> Parceiros \\-\\> Solicitações \\-\\> clique sobre o Check\\-in desejado\\. [Saiba mais](https://youtu.be/\\-mrOK7_Q8IQ)';
                }
                if(Bot.msgContains(messagetext, 'ETIQUETA')) {
                    response = 'Você pode imprimir etiquetas em qualquer tipo de impressora utilizando o AppCollaborative, lembre\\-se sempre de utilizar o Google Chrome. Para mais detalhes preparamos esse video que ensina como configurar e imprimir: [Etiquetas](https://youtu.be/uBjCMwXFRJI)';
                }
            }
            if(Bot.msgContains(messagetext, 'CHECKOUT') ||
                Bot.msgContains(messagetext, 'CHECK-OUT')) {
                if(Bot.msgContains(messagetext, 'FAZER') ||
                    Bot.msgContains(messagetext, 'EFETUAR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'FAZ')) {
                    response = 'Você pode fazer o Check\\-out através do seu acesso na plataforma, e quando o check\\-out é finalizado, fica disponível para a loja aceitar ou negar\\. [Saiba mais](https://youtu.be/3_9_ceZ5nWU)';
                }
                if(Bot.msgContains(messagetext, 'ACEITAR') ||
                    Bot.msgContains(messagetext, 'ACEITA') ||
                    Bot.msgContains(messagetext, 'ACEITO') ||
                    Bot.msgContains(messagetext, 'NEGAR') ||
                    Bot.msgContains(messagetext, 'NEGO') ||
                    Bot.msgContains(messagetext, 'NEGA')) {
                    response = 'O lojista pode aceitar ou negar um Check\\-out, através do menu \\-\\> Parceiros \\-\\> Solicitações \\-\\> clique sobre o Check\\-out desejado\\. [Saiba mais](https://youtu.be/3_9_ceZ5nWU)';
                }
            }
            if(Bot.msgContains(messagetext, 'ETIQUETA')) {
                response = 'Você pode imprimir etiquetas em qualquer tipo de impressora utilizando o AppCollaborative, lembre\\-se sempre de utilizar o Google Chrome, para mais detalhes preparamos esse video que ensina como configurar e imprimir: [Etiquetas](https://youtu.be/uBjCMwXFRJI)';
            }
            if(Bot.msgContains(messagetext, 'PRODUTO')) {
                if(Bot.msgContains(messagetext, 'CADASTR') ||
                    Bot.msgContains(messagetext, 'SALV') ||
                    Bot.msgContains(messagetext, 'EDIT') ||
                    Bot.msgContains(messagetext, 'MUD')
                ) {
                    response = 'Você consegue inserir e editar produtos através de solicitações';
                }
                if(Bot.msgContains(messagetext, 'DESCONTO')) {
                    response = 'Você pode cadastrar um desconto direto no produto pelo Check\\-in ou solicitando alteração no estoque, e assim, toda vez que o produto for adicionado na venda já entrará com o valor do desconto, esse desconto também será exibido no e\\-commerce\\.';
                }
                if(Bot.msgContains(messagetext, 'CUSTO')) {
                    response = 'você pode cadastrar o preço de custo no produto, e depois apurar os produtos vendidos pelo preço de custo no relatório de vendas. Para isso, marque a opção de visualização com preço de custo\\.';
                }
                if(Bot.msgContains(messagetext, 'MARKUP') ||
                    Bot.msgContains(messagetext, 'COMISSAO')) {
                    response = 'Por padrão, o sistema considera o cálculo de comissão com base na porcentagem informada no campo de markup no cadastro do parceiro.';
                }
                if(Bot.msgContains(messagetext, 'FOTO')) {
                    response = 'Você pode cadastrar uma foto por produto, dependendo do tema utilizado é possível adicionar até três fotos por produto\\.';
                }
            }
            if(Bot.msgContains(messagetext, 'VENDA')) {
                if(Bot.msgContains(messagetext, 'FAZ') ||
                    Bot.msgContains(messagetext, 'CADASTR') ||
                    Bot.msgContains(messagetext, 'FAÇO') ||
                    Bot.msgContains(messagetext, 'EFETUA') ||
                    Bot.msgContains(messagetext, 'PAGA')) {
                    response = 'preparamos um vídeo que vai te ajudar a entender mais sobre as vendas, segue: [Video](https://youtu.be/PMYwO0bIwgk)';
                }
                if(Bot.msgContains(messagetext, 'APAGA') ||
                    Bot.msgContains(messagetext, 'DELETA')) {
                    response = 'preparamos um vídeo que mostra como deletar uma venda, segue: [Video](https://youtu.be/YRnrEKDAhtk)';
                }
            }
        }

        if(response === '') return Bot.sendDuvidaNaoSei(chat_id, datares, messagetext);
        return Bot.sendMessageMarkdown(
            chat_id,
            response
        );
    }

    static sendDuvidaNaoSei(chat_id, datares, messagetext) {
        let responsearr = [
            'Olha, eu não entendi, você poderia reformular sua dúvida?',
            'eu ainda estou aprendendo, então no momento eu não sei responder sua dúvida',
            'eu não sei, mas em breve vou aprender mais e estarei pronta para te responder',
            'eu não entendi, ainda estou aprendendo sobre o assunto',
            'hmmm...  eu não sei te responder sobre isso, mas vou procurar saber.'
        ];
        let randomIndex = Math.floor(Math.random() * (responsearr.length - 1));
        let response = (responsearr[randomIndex]) ? responsearr[randomIndex] : responsearr[0];
        Bot.salvaMensagemNaoEntendida(chat_id, datares, messagetext);
        return Bot.sendMessage(
            chat_id,
            response
        );
    }

    static getMesByString(mes) {
        mes = mes.toUpperCase();
        switch (mes) {
            case 'JANEIRO':
                return '01';
            case 'FEVEREIRO':
                return '02';
            case 'MARÇO':
                return '03';
            case 'ABRIL':
                return '04';
            case 'MAIO':
                return '05';
            case 'JUNHO':
                return '06';
            case 'JULHO':
                return '07';
            case 'AGOSTO':
                return '08';
            case 'SETEMBRO':
                return '09';
            case 'OUTUBRO':
                return '10';
            case 'NOVEMBRO':
                return '11';
            case 'DEZEMBRO':
                return '12';
            default:
                return mes;
        }
    }

    static getParamsMesToQuery(messagetext, query, paramq, startin, endin, possba, possbb) {
        let mesp = messagetext.toUpperCase().split(startin);
        let part = (Bot.msgContains(messagetext, endin))
            ? mesp[1].split(possba) : mesp[1].split(possbb);
        let mes = Bot.getMesByString(part[0].trim());
        return (Bot.msgContains(query, '?')) ?
            `&${paramq}=${mes}` : `?${paramq}=${mes}`;
    }

    static getParamsAnoToQuery(messagetext, query) {
        let mesp = (Bot.msgContains(messagetext, 'ANO DE '))
            ? messagetext.toUpperCase().split('ANO DE') : messagetext.toUpperCase().split('ANO ');
        let year = mesp[1].trim();
        query += `&year=${year}`;
        return query;
    }

    static processaConsultaQuantidadeVenda(datares, chat_id, messagetext, query) {
        return new Promise(function(resolve, reject) {
            console.log('processaConsultaQuantidadeVenda');
            Bot.consulta(chat_id, query)
            .then(function(result) {
                let amount = 0;
                let open = 0;
                let closed = 0;
                if(result.data) {
                    for(let item of result.data) {
                        amount += parseFloat(item.amount);
                        if(item.status == 'ABE') {
                            open += parseFloat(item.amount);
                        } else if(item.status == 'BAI') {
                            closed += parseFloat(item.amount);
                        }
                    }
                    Bot.sendMessage(
                        chat_id,
                        `Foram feitas um total de ${result._links.count} vendas, que totalizam R$${amount.toFixed(2)}. Sendo um total de R$${open.toFixed(2)} em aberto, e R$${closed.toFixed(2)} de vendas pagas.`
                    ).then(res => resolve(res))
                    .catch(err => resolve(err));
                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            })
        });
    }

    static processaConsultaQuantidadeItem(datares, chat_id, messagetext, query) {
        return new Promise(function(resolve, reject) {
            console.log('processaConsultaQuantidadeItem');
            Bot.consulta(chat_id, query)
            .then(function(result) {
                let commission = 0;
                let closed = 0;
                if(result.data) {
                    for(let item of result.data) {
                        if(item.sale.status == 'BAI') {
                            closed += parseFloat(item.amount);
                            commission += parseFloat(item.commission);
                        }
                    }
                    Bot.sendMessage(
                        chat_id,
                        `Um total de ${result.data.length} de vendas, que totalizam R$${closed.toFixed(2)}. Sendo um total de R$${commission.toFixed(2)} em comissão`
                    ).then(res => resolve(res))
                    .catch(err => resolve(err));
                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            })
        });
    }

    static processaConsultaQuantidadeMarcas(datares, chat_id, messagetext, query) {
        return new Promise(function(resolve, reject) {
            console.log('processaConsultaQuantidadeMarcas');
            Bot.consulta(chat_id, query)
            .then(function(result) {
                console.log(result);
                if(result.data) {
                    console.log(`QUANTIDADE DO LINKS COUNT: ${result._links.count}, QUANTIDADE DO ARRAY: ${result.data.length}`);
                    Bot.sendMessage(
                        chat_id,
                        `Você possui um total de ${result._links.count} marcas parceiras.`
                    ).then(res => resolve(res))
                    .catch(err => resolve(err));
                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            })
        });
    }

    static processaConsultaQuantidadeTroca(datares, chat_id, messagetext, query) {
        return new Promise(function(resolve, reject) {
            console.log('processaConsultaQuantidadeTroca');
            Bot.consulta(chat_id, query)
            .then(function(result) {
                console.log(result);
                if(result.data) {
                    Bot.sendMessage(
                        chat_id,
                        `Foram feitas um total de ${result._links.count} trocas.`
                    ).then(res => resolve(res))
                    .catch(err => resolve(err));
                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            })
        });
    }

    static processaConsultaDiaMaisVendeu(datares, chat_id, messagetext, query) {
        return new Promise(function(resolve, reject) {
            console.log('processaConsultaDiaMaisVendeu');
            Bot.consulta(chat_id, query)
            .then(function(result) {
                let maisvendeu = {};
                if(result.data) {
                    for(let item of result.data) {
                        if(!maisvendeu.id) maisvendeu = item;
                        if(parseFloat(item.amount) > parseFloat(maisvendeu.amount)) {
                            maisvendeu = item;
                        }
                    }
                    let message = (maisvendeu.id)
                        ? `Foi no dia ${maisvendeu.contability_at.substr(0, 10)}, um total de R$${maisvendeu.amount}.`
                        : 'Nesse mês não foram realizadas vendas.';

                    Bot.sendMessage(
                        chat_id,
                        message
                    ).then(res => resolve(res))
                    .catch(err => resolve(err));
                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            })
        });
    }

    static processaConsultaMarcaMaisVendeu(datares, chat_id, messagetext, query) {
        return new Promise(function(resolve, reject) {
            console.log('processaConsultaMarcaMaisVendeu');
            Bot.consulta(chat_id, query)
            .then(function(result) {
                let maisvendeu = {};
                let menosvendeu = {}
                if(result.data) {
                    for(let item of result.data) {
                        if(!maisvendeu.id) maisvendeu = item;
                        if(!menosvendeu.id) menosvendeu = item;
                        if(parseFloat(item.amount) > parseFloat(maisvendeu.amount)) {
                            maisvendeu = item;
                        }
                        if(parseFloat(item.amount) < parseFloat(menosvendeu.amount)) {
                            menosvendeu = item;
                        }
                    }
                    let message = '';
                    if((maisvendeu.id)) {
                        message += `A marca que mais vendeu foi a ${maisvendeu.brand.name} somando R$${maisvendeu.amount}`;
                    }
                    if(menosvendeu.id) {
                        message += `, e a marca que menos vendeu foi a ${menosvendeu.brand.name}, um total de R$${menosvendeu.amount}`;
                    }
                    if(message != '') {
                        message += ', isso sem incluir as marcas que não venderam nada.';
                        Bot.sendMessage(
                            chat_id,
                            message
                        ).then(res => resolve(res))
                        .catch(err => resolve(err));
                    } else {
                        Bot.sendDuvidaNaoSei(chat_id, datares, messagetext)
                        .then(res => resolve(res))
                        .catch(err => resolve(err));
                    }

                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            })
        });
    }

    static processaConsultaProdutoMaisVendeu(datares, chat_id, messagetext, query) {
        return new Promise(function(resolve, reject) {
            console.log('processaConsultaProdutoMaisVendeu');
            Bot.consulta(chat_id, query)
            .then(function(result) {
                let maisvendeu = {};
                let menosvendeu = {}
                if(result.data) {
                    for(let item of result.data) {
                        if(!maisvendeu.id) maisvendeu = item;
                        if(!menosvendeu.id) menosvendeu = item;
                        if(parseFloat(item.amount) > parseFloat(maisvendeu.amount)) {
                            maisvendeu = item;
                        }
                        if(parseFloat(item.amount) < parseFloat(menosvendeu.amount)) {
                            menosvendeu = item;
                        }
                    }
                    let message = '';
                    if((maisvendeu.id)) {
                        message += `O produto que mais vendeu foi (${maisvendeu.product.id}) ${maisvendeu.product.description} somando R$${maisvendeu.amount}`;
                    }
                    if(menosvendeu.id) {
                        message += `, e o produto que menos vendeu foi (${menosvendeu.product.id}) ${menosvendeu.product.description} somando R$${menosvendeu.amount}`;
                    }
                    if(message != '') {
                        message += ', isso sem incluir os produtos que não venderam nada.';
                        Bot.sendMessage(
                            chat_id,
                            message
                        ).then(res => resolve(res))
                        .catch(err => resolve(err));
                    } else {
                        Bot.sendDuvidaNaoSei(chat_id, datares, messagetext)
                        .then(res => resolve(res))
                        .catch(err => resolve(err));
                    }

                }
            })
            .catch(function(err) {
                console.log(err);
                reject(err);
            })
        });
    }

    static haveAno(messagetext) {
        let anos = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];
        for(let ano of anos) {
            if(Bot.msgContains(messagetext, ano)) {
                return true;
            }
        }
        return false;
    }

    static getAno(messagetext) {
        let anos = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];
        for(let ano of anos) {
            if(Bot.msgContains(messagetext, ano)) {
                return ano;
            }
        }
        return false;
    }

    static haveMes(messagetext) {
        let meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        for(let mes of meses) {
            if(Bot.msgContains(messagetext, mes)) {
                return true;
            }
        }
        return false;
    }

    static getMes(messagetext) {
        let meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        for(let mes of meses) {
            if(Bot.msgContains(messagetext, mes)) {
                return mes;
            }
        }
        return false;
    }

    static isMes(messtr) {
        let meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        for(let mes of meses) {
            if(messtr == mes) {
                return true;
            }
        }
        return false;
    }

    static consultaPeriodo(datares, chat_id, messagetext, query, tocall) {
        if(Bot.msgContains(messagetext, 'MÊS') ||
            Bot.msgContains(messagetext, 'MES') ||
            Bot.haveMes(messagetext)) {
            if(Bot.msgContains(messagetext, 'ESTE MÊS') ||
                Bot.msgContains(messagetext, 'ESTE MES') ||
                Bot.msgContains(messagetext, 'ESSE MÊS') ||
                Bot.msgContains(messagetext, 'ESSE MES') ||
                Bot.msgContains(messagetext, 'MÊS ATUAL') ||
                Bot.msgContains(messagetext, 'MES ATUAL') ||
                Bot.msgContains(messagetext, 'MÊS CORRENTE')) {
                    query += (Bot.msgContains(query, '?')) ?
                        '&month=CURRENT' : '?month=CURRENT';
                    query += '&year=CURRENT&per_page=999'
                    return tocall(datares, chat_id, messagetext, query);
            }
            if(Bot.msgContains(messagetext, 'NO MÊS DE') ||
                Bot.msgContains(messagetext, 'NO MES DE') ||
                Bot.msgContains(messagetext, 'NO MÊS') ||
                Bot.msgContains(messagetext, 'NO MES')) {
                if(Bot.msgContains(messagetext, 'ESTE ANO') ||
                    Bot.msgContains(messagetext, 'ESSE ANO')) {
                    if(Bot.msgContains(messagetext, 'MÊS DE')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'MÊS DE ', 'ESSE ANO', 'ESSE', 'ESTE');
                        query += '&year=CURRENT&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                    if(Bot.msgContains(messagetext, 'MES DE')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'MES DE ', 'ESSE ANO', 'ESSE', 'ESTE');
                        query += '&year=CURRENT&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                    if(Bot.msgContains(messagetext, 'NO MES')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'NO MES ', 'ESSE ANO', 'ESSE', 'ESTE');
                        query += '&year=CURRENT&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                    if(Bot.msgContains(messagetext, 'NO MÊS')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'NO MÊS ', 'ESSE ANO', 'ESSE', 'ESTE');
                        query += '&year=CURRENT&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                }
                if(Bot.msgContains(messagetext, 'NO ANO DE') ||
                    Bot.msgContains(messagetext, 'NO ANO') ||
                    Bot.msgContains(messagetext, 'ANO')
                ) {
                    if(Bot.msgContains(messagetext, 'MÊS DE')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'MÊS DE ', 'NO ANO', 'NO ANO', 'ANO');
                        query += Bot.getParamsAnoToQuery(messagetext, query);
                        query += '&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                    if(Bot.msgContains(messagetext, 'MES DE')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'MES DE ', 'NO ANO', 'NO ANO', 'ANO');
                        query += Bot.getParamsAnoToQuery(messagetext, query);
                        query += '&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                    if(Bot.msgContains(messagetext, 'NO MES')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'NO MES ', 'NO ANO', 'NO ANO', 'ANO');
                        query += Bot.getParamsAnoToQuery(messagetext, query);
                        query += '&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                    if(Bot.msgContains(messagetext, 'NO MÊS')) {
                        query += Bot.getParamsMesToQuery(messagetext, query, 'month', 'NO MÊS ', 'NO ANO', 'NO ANO', 'ANO');
                        query += Bot.getParamsAnoToQuery(messagetext, query);
                        query += '&per_page=999'
                        return tocall(datares, chat_id, messagetext, query);
                    }
                }
            }
            if(Bot.haveMes(messagetext)) {
                let mes = Bot.getMesByString(Bot.getMes(messagetext));
                query += (Bot.msgContains(query, '?')) ? `&month=${mes}` : `?month=${mes}`;
                if(Bot.haveAno(messagetext)) {
                    let ano = Bot.getAno(messagetext);
                    query += `&year=${ano}`;
                } else {
                    query += `&year=CURRENT`;
                }
                return tocall(datares, chat_id, messagetext, query);
            }
        }
        if(Bot.msgContains(messagetext, 'HOJE')) {
            query += '&contability_date=today';
            return tocall(datares, chat_id, messagetext, query);
        }
        if(Bot.msgContains(messagetext, 'ONTEM')) {
            query += '&contability_date=yesterday';
            return tocall(datares, chat_id, messagetext, query);
        }
        return Bot.sendDuvidaNaoSei(chat_id, datares, messagetext);
    }

    static salvaMensagemNaoEntendida(chat_id, datares, messagetext) {
        console.log('MENSAGEM NAO ENTENDIDA!!', messagetext);
        console.log(chat_id, datares);
    }

    static sendSugestao(chat_id, datares, messagetext, sugestao) {
        return new Promise(function(resolve, reject) {
            Bot.salvaMensagemNaoEntendida(chat_id, datares, messagetext);
            Bot.sendMessage(
                chat_id,
                sugestao
            ).then(res => resolve(res))
            .catch(err => resolve(err));
        });
    }

    static intencaoConsultaQuantidade(datares, chat_id, messagetext) {
        console.log('intencaoConsultaQuantidade');

        let response = '';
        if(Bot.isDefault(datares)) {
            if(Bot.msgContains(messagetext, 'VENDA')) {
                if(Bot.msgContains(messagetext, 'LOJA')) {
                    return Bot.consultaPeriodo(
                        datares,
                        chat_id,
                        messagetext,
                        'sales?user_name=!ECOMMERCE',
                        Bot.processaConsultaQuantidadeVenda
                    );
                }
                if(Bot.msgContains(messagetext, 'ECOMMERCE') ||
                    Bot.msgContains(messagetext, 'E-COMMERCE') ||
                    Bot.msgContains(messagetext, 'SITE')) {
                    return Bot.consultaPeriodo(
                        datares,
                        chat_id,
                        messagetext,
                        'sales?user_name=ECOMMERCE',
                        Bot.processaConsultaQuantidadeVenda
                    );
                }
                if(Bot.msgContains(messagetext, 'FIZ')) {
                    return Bot.consultaPeriodo(
                        datares,
                        chat_id,
                        messagetext,
                        `sales?user_id=${datares.data.user.id}`,
                        Bot.processaConsultaQuantidadeVenda
                    );
                }
                return Bot.consultaPeriodo(
                    datares,
                    chat_id,
                    messagetext,
                    'sales',
                    Bot.processaConsultaQuantidadeVenda
                );
            }
            if(Bot.msgContains(messagetext, 'TROCA')) {
                if(Bot.msgContains(messagetext, 'FIZ')) {
                    return Bot.consultaPeriodo(
                        datares,
                        chat_id,
                        messagetext,
                        `sales/exchanges?user_id=${datares.data.user.id}`,
                        Bot.processaConsultaQuantidadeTroca
                    );
                }
                return Bot.consultaPeriodo(
                    datares,
                    chat_id,
                    messagetext,
                    'sales/exchanges',
                    Bot.processaConsultaQuantidadeTroca
                );
            }
            if(Bot.msgContains(messagetext, 'MARCA')
                || Bot.msgContains(messagetext, 'PARCEIR')) {
                return Bot.processaConsultaQuantidadeMarcas(datares, chat_id, messagetext, 'partners?per_page=999');
            }
            return Bot.sendSugestao(chat_id, datares, messagetext,
                'Não entendi a pergunta, você pode me perguntar por exemplo: Quantas vendas foram feitas este mês, ou quantas trocas foram feitas em dezembro de 2020'
            );
        }
        if(Bot.isPartner(datares)) {
            if(Bot.msgContains(messagetext, 'VENDA')) {
                return Bot.consultaPeriodo(
                    datares,
                    chat_id,
                    messagetext,
                    'sales/comissions?ump=1&sum=amount&group=sale_id',
                    Bot.processaConsultaQuantidadeItem
                );
            }
            return Bot.sendSugestao(chat_id, datares, messagetext,
                'Não entendi a pergunta, você pode me perguntar por exemplo: Quantas vendas feitas este mês, ou quantas vendas foram feitas em dezembro de 2020'
            );
        }

        if(response === '') return Bot.sendDuvidaNaoSei(chat_id, datares, messagetext);
        return Bot.sendMessage(
            chat_id,
            response
        );
    }

    static intencaoConsultaIdentidade(datares, chat_id, messagetext) {
        console.log('intencaoConsultaIdentidade');
        let response = '';

        if(Bot.isDefault(datares)) {
            if(Bot.msgContains(messagetext, 'VEND')) {
                if(Bot.msgContains(messagetext, 'QUAL DIA') ||
                    Bot.msgContains(messagetext, 'QUE DIA')) {
                    return Bot.consultaPeriodo(
                        datares,
                        chat_id,
                        messagetext,
                        'sales?sum=amount&group=contability_date,status&sort=contability_date&lastdays=31',
                        Bot.processaConsultaDiaMaisVendeu
                    );
                }
                if(Bot.msgContains(messagetext, 'MARCA') ||
                    Bot.msgContains(messagetext, 'PARCEIR')) {
                    return Bot.consultaPeriodo(
                        datares,
                        chat_id,
                        messagetext,
                        'sales/items?sum=amount&group=brand_id',
                        Bot.processaConsultaMarcaMaisVendeu
                    );
                }
                return Bot.consultaPeriodo(
                    datares,
                    chat_id,
                    messagetext,
                    'sales/items?sum=amount&group=product_id',
                    Bot.processaConsultaProdutoMaisVendeu
                );
            }
            if(Bot.msgContains(messagetext, 'MARCA') ||
                Bot.msgContains(messagetext, 'PARCEIR')) {

            }
        }
        if(Bot.isPartner(datares)) {
            if(Bot.msgContains(messagetext, 'VEND')) {

            }
        }

        if(response === '') return Bot.sendDuvidaNaoSei(chat_id, datares, messagetext);
        return Bot.sendMessage(
            chat_id,
            response
        );
    }

    static msgStartWith(messagetext, starts) {
        return (new RegExp('^' + starts, 'i')).test(messagetext);
    }

    static intencaoSetarLoja(datares, chat_id, messagetext) {
        return new Promise((resolve,reject) => {
            let parts = messagetext.toUpperCase().split('LOJA ');
            let envid = parts[1].trim();
            Bot.setarLojaPreferencia(datares, chat_id, envid)
            .then(res => {
                Bot.sendMessage(chat_id, 'Loja selecionada com sucesso, por favor repita a pergunta.')
                .then(res => resolve(res))
                .catch(err => resolve(err));
            })
            .catch(err => {
                console.log('ERR', err);
                Bot.sendMessage(chat_id, 'Não consegui selecionar a loja, verifica se você digitou o nome correto.')
                .then(res => resolve(res))
                .catch(err => resolve(err));
            })
        });
    }

    static intencaoTrocarLoja(datares, chat_id, messagetext) {
        return new Promise((resolve,reject) => {
            Bot.setarLojaPreferencia(datares, chat_id, null)
            .then(res => {
                Bot.consulta(chat_id, 'scripts/ping')
                .then(res => resolve(res))
                .catch(err => resolve(err));
            })
            .catch(err => {
                console.log('ERR', err);
                Bot.sendMessage(chat_id, 'Não consegui selecionar a loja, verifica se você digitou o nome correto.')
                .then(res => resolve(res))
                .catch(err => resolve(err));
            })
        });
    }

    static processConversation(req, datares) {
        const chat_id = req.body.message.chat.id;
        const messagetext = req.body.message.text;
        let response = '';
        console.log('MENSAGEM', messagetext);
        console.log('processConversation');

        response = Bot.respostaDireta(messagetext);
        if(Bot.msgContains(messagetext, 'COMO')) {
            return Bot.intencaoDuvida(datares, chat_id, messagetext);
        }
        if(Bot.msgContains(messagetext, 'QUANTO')
            || Bot.msgContains(messagetext, 'QUANTOS')
            || Bot.msgContains(messagetext, 'QUANTAS')
            || Bot.msgContains(messagetext, 'QUANTA')) {
            return Bot.intencaoConsultaQuantidade(datares, chat_id, messagetext);
        }
        if(Bot.msgContains(messagetext, 'QUAL')
            || Bot.msgContains(messagetext, 'O QUE')) {
            return Bot.intencaoConsultaIdentidade(datares, chat_id, messagetext);
        }
        if(Bot.msgContains(messagetext, 'TROCAR DE LOJA')
            && Bot.msgStartWith(messagetext, 'TROCAR DE LOJA')) {
            return Bot.intencaoTrocarLoja(datares, chat_id, messagetext);
        }
        if(Bot.msgContains(messagetext, 'LOJA')
            && Bot.msgStartWith(messagetext, 'LOJA')) {
            return Bot.intencaoSetarLoja(datares, chat_id, messagetext);
        }
        if(response === '') response = Bot.conversaFiada(messagetext);

        if(response === '') return Bot.sendDuvidaNaoSei(chat_id, datares, messagetext);
        return Bot.sendMessage(
            chat_id,
            response
        );
    }
}