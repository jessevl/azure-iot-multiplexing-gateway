import * as restify from 'restify';
import { Gateway } from '../Gateway';
import { Message } from 'azure-iot-common';
import { AmqpMessage } from 'azure-iot-amqp-base';

require('dotenv').config();

var connectionString = process.env.IOTHUB_CONNECTION_STRING;

var gateway = new Gateway();

var latestMessage = {};

gateway.on('message', (message) => {
  latestMessage = message;
  console.log(message);
});

var server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.get('/', function (req, res, next) {
  res.send(latestMessage);
  next();
});

server.post('/:deviceId', async function (req, res, next) {
  var message = new Message(req.body);
  console.log(JSON.stringify(message));
  console.time('Send message took');
  try {
    await gateway.sendMessage(req.params.deviceId, message);
    console.timeEnd('Send message took');
    res.statusCode = 201;
    res.send();
  } catch (error) {
    console.log(error);
    res.statusCode = 500;
    res.send(error);
  }
  next();
});

server.post('/:deviceId/twin', async function (req, res, next) {
  var message = new AmqpMessage();
  message.body = JSON.stringify(req.body);
  console.log(message.body);

  console.time('Send message took');
  try {
    await gateway.updateTwin(req.params.deviceId, message);
    console.timeEnd('Send message took');
    res.statusCode = 201;
    res.send();
  } catch (error) {
    console.log(error);
    res.statusCode = 500;
    res.send(error);
  }
  next();
});

var start = async function () {
  console.time('Open took');
  try {
    await gateway.open(connectionString);
    console.timeEnd('Open took');

  } catch (error) {
    console.log(error);
    try {
      await gateway.close();
      server.close();
    } catch (error) {
      console.log(error);
      server.close();
    }
  }
};

var port = process.env.PORT || 8080;
server.listen(port, function() {
  console.log('Server listening at %s', server.url);
  start();
});
