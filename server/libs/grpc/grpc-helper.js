// config
require('dotenv').config()

// Node.js libs 
const path = require('path');
const fs = require('fs');

// filepaths
const filepath = path.resolve(__dirname, '../../../proto/bookshop.proto');
const caCertPath = path.resolve(__dirname, '../openssl/ca.cert');
const serverCertPath = path.resolve(__dirname, '../openssl/server.cert');
const serverKeyPath = path.resolve(__dirname, '../openssl/server.key');

// jwt validator
const jwtValidator = require(path.resolve(__dirname, '../jwt/jwt-validator'));
const keycloakPubKeyPath = path.resolve(__dirname, '../jwt/keycloak-pk.pem');

//gRPC libs
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// load protobuf definition
const packageDefinition = protoLoader.loadSync(filepath);
const BookshopDefinition = grpc.loadPackageDefinition(packageDefinition);

// mongodb libs
const mongo = require('../mongodb/mongodb-helper');

// unauthorized response
const UNAUTHENTICATED_RESPONSE = {
	code: grpc.status.UNAUTHENTICATED,
	message: process.env.UNAUTHENTICATED_MESSAGE,
}

function init() {
	// create server
	const server = new grpc.Server()
	
	// add protobuf service
	server.addService(BookshopDefinition.BookshopService.service, {List, Find, Add, Remove})

	// bind secure connection with TLS
	server.bindAsync(`${process.env.HOST}:${process.env.PORT}`, grpc.ServerCredentials.createSsl(
		fs.readFileSync(caCertPath),
		[{
			cert_chain: fs.readFileSync(serverCertPath),
			private_key: fs.readFileSync(serverKeyPath)
		}],
		false
	), (err, port) => {
		if (err) {
			console.error('Error binding grpc: ' + err.stack);
			return;
		}
	
		// start server
		server.start()
		console.log(`Server listening to port ${port}...`)
	})	
}

async function List (call, cb) {
	// authorization
	const error = await authorize(call);
	if (error) {
		return cb(error);	
	}

	mongo.getAllBooks()
	.then(res => {
		return cb(null, {books: res})
	}).catch(err => {
		// unexpected error
		return cb({
			code: grpc.status.UNKNOWN,
			message: err.message,
		});
	});
}

async function Find (call, cb) {
	// authorization
	const error = await authorize(call);
	if (error) {
		return cb(error);	
	}

	mongo.findBook(call.request.id)
	.then(res => {
		if (!res.id) {
			// not found
			return cb({
				code: grpc.status.NOT_FOUND,
				message: 'Requested resource was not found',
			});	
		}

		return cb(null, res)
	}).catch(err => {
		// unexpected error
		return cb({
			code: grpc.status.UNKNOWN,
			message: err.message,
		});
	});
}

async function Add(call, cb) {
	// authorization
	const error = await authorize(call);

	if (error) {
		return cb(error);	
	}

	mongo.addBook(call.request)
	.then(res => {
		return cb(null, res)
	}).catch(err => {
		console.log(err)
		// unexpected error
		return cb({
			code: grpc.status.UNKNOWN,
			message: err.message,
		});
	});
}

function Remove(call, cb) {
	// authorization
	const error = authorize(call);
	if (error) {
		return cb(error);	
	}

	mongo.removeBook(call.request.id)
	.then(() => {
		return cb(null, {})
	}).catch(err => {
		// unexpected error
		return cb({
			code: grpc.status.UNKNOWN,
			message: err.message,
		});
	});
}

async function authorize(call) {
	// no metadata
	if (!call) return UNAUTHENTICATED_RESPONSE;	 
	
	// get the bearer token string
	const token = call.metadata.get('Authorization')[0] && call.metadata.get('Authorization')[0].split(' ')[1];
	
	// no token
	if (!token) return UNAUTHENTICATED_RESPONSE;

	try {
		// validate token
		jwtValidator.validateWithPubKeyFile(token, keycloakPubKeyPath);
	 } catch(err) {
		 // unauthorized
		return UNAUTHENTICATED_RESPONSE;
	 }

	 // no errors
	return null
}

module.exports = {
	init
}