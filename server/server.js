// config
require('dotenv').config()

// Node.js libs 
const path = require('path');
const fs = require('fs');

// filepaths
const filepath = path.resolve(__dirname, '../proto/bookshop.proto');
const caCertPath = path.resolve(__dirname, './libs/openssl/ca.cert');
const serverCertPath = path.resolve(__dirname, './libs/openssl/server.cert');
const serverKeyPath = path.resolve(__dirname, './libs/openssl/server.key');
const keycloakPubKeyPath = path.resolve(__dirname, './libs/jwt/keycloak-pk.pem');

//gRPC libs
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// load protobuf definition
const packageDefinition = protoLoader.loadSync(filepath);
const BookshopDefinition = grpc.loadPackageDefinition(packageDefinition);

// MongoDB libs & vars
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId; 
let db

// jwt validator
const jwtValidator = require(path.resolve(__dirname, './libs/jwt/jwt-validator'));

// unauthorized response
const UNAUTHENTICATED_RESPONSE = {
	code: grpc.status.UNAUTHENTICATED,
	message: process.env.UNAUTHENTICATED_MESSAGE,
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

function mapBook(book) {
	// return protobuf book
	return !book ? {} : {
		id: book._id,
		title: book.title,
		author: book.author,
		publishDate: book.publishDate,
		pages: book.pages,
		price: book.price
	}
}

function getAllBooks() {
	// get all books from MongoDB
	return new Promise(function(resolve, reject) {
		db.collection('books').find({}).toArray((err, result) => {
			if (err) {
				reject(err);
			} 

			resolve(result.map(item => mapBook(item)));
		});
	});
}

function findBook(id) {
	// find a specific book in MongoDB
	return new Promise(function(resolve, reject) {
		db.collection('books').findOne({_id: new ObjectId(id)}, (err, result) => {
			if (err) {
				reject(err);
			} 

			resolve(mapBook(result));
		});
	});
}

function addBook(book) {
	// insert a book in MongoDB
	return new Promise(function(resolve, reject) {
		db.collection('books').insertOne(book, (err, result) => {
			if (err) {
				reject(err);
			} 

			resolve({insertedId: result.insertedId.toString()});
		});
	});
}

function removeBook(id) {
	// remove a book from MongoDB
	return new Promise(function(resolve, reject) {
		db.collection('books').deleteOne({_id: new ObjectId(id)}, (err, result) => {
			if (err) {
				reject(err);
			} 

			resolve();
		});
	});
}

async function List (call, cb) {
	// authorization
	const error = await authorize(call);
	if (error) {
		return cb(error);	
	}

	getAllBooks()
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

	findBook(call.request.id)
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

function Add(call, cb) {
	// authorization
	const error = authorize(call);
	if (error) {
		return cb(error);	
	}

	addBook(call.request)
	.then(res => {
		return cb(null, res)
	}).catch(err => {
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

	removeBook(call.request.id)
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

mongoClient.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}`, (err, client) => {
	if (err) {
		console.error('error connecting: ' + err.stack);
		return;
	}

	console.log('connected to mongodb!')

	// get database
	db = client.db(process.env.DATABASE_NAME)

	// create server
	const server = new grpc.Server()
	
	// add protobuf service
	server.addService(BookshopDefinition.BookshopService.service, {List, Find, Add, Remove})

	// server.bindAsync(`${process.env.HOST}:${process.env.PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
	// 	if (err) {
	// 		console.error('Error binding grpc: ' + err.stack);
	// 		return;
	// 	}
	
	// 	server.start()
	// 	console.log(`Server listening to port ${port}...`)
	// })

	// bind secure connection TLS
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
});
