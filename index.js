/*###############################################################################
#
# EOS Mongo History API
# API to get actions using EOS mongo plugin (similar to history plugin)
#
# Examples:
# https://history.cryptolions.io/v1/history/get_actions/cryptolions1
# https://history.cryptolions.io/v1/history/get_actions/cryptolions1/sethash
# https://history.cryptolions.io/v1/history/get_actions/cryptolions1/sethash?limit=2&skip=1&sort=-1
#
# Git Hub: https://github.com/CryptoLions/EOS-mongo-history-API
#
# Created by http://CryptoLions.io
#
###############################################################################  */
require('appmetrics-dash').monitor();
const MongoClient 	= require('mongodb').MongoClient;
const ObjectId      = require('mongodb').ObjectID;
const swaggerJSDoc 	= require('swagger-jsdoc');
const bodyparser 	  = require('body-parser');
const CONFIG		    = require('./config.js');

const swStats = require('swagger-stats');
const apiSpec = require('./swagger.json');

const MONGO_OPTIONS = {
    socketTimeoutMS: 60000,
    keepAlive: true,
    reconnectTries: 30000,
    useNewUrlParser: true
};

const swaggerSpec = swaggerJSDoc({
  definition: {
    info: {
      title: 'EOS history API by Cryptolions',
      version: '1.0.0',
    },
  },
  apis: ['./api/v1.api.history.js'],
});

const express 		= require('express');
const app 			  = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(swStats.getMiddleware({ uriPath: "/metrics", swaggerSpec: apiSpec }));

// parse requests from eosjs (v16.0.0 - 16.0.9)
app.use((req, res, next) => {
      if (req.method !== 'POST' || req.headers['content-type'] === 'application/json'){
          return next();
      }
      let body = '';
      req.on('data', chunk => {
          body += chunk.toString();
      });
      req.on('end', () => {
          try{
            req.body = JSON.parse(body);
          } catch(e){
            console.error('JSON POST request parse error - ', e);
          }
          next();
      });
});
app.use(bodyparser.json());

app.use('/', express.static(__dirname + '/html'));


process.on('uncaughtException', (err) => {
    console.error(`======= UncaughtException API Server :  ${err}`);
});

MongoClient.connect( CONFIG.mongoURL, MONGO_OPTIONS, (err, db) => {
		if (err){
			return console.error("Database error !!!", err);
		}
        console.log("=== Database Connected!");
        let dbo = db.db(CONFIG.mongoDB);
		require('./api/v1.api.history')(app, dbo, swaggerSpec, ObjectId);        
});

const http 	= require('http').Server(app);
http.listen(CONFIG.serverPort, () => {
  	 console.log('=== Listening on port:', CONFIG.serverPort);
});
http.on('error', (err) => {
	 console.error('=== Http server error', err);
});
