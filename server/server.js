const path = require('path')
const grpc = require('@grpc/grpc-js');
// const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader')
const filepath = path.resolve(__dirname, '../proto/bookshop.proto')
const packageDefinition = protoLoader.loadSync(filepath)
const BookshopDefinition = grpc.loadPackageDefinition(packageDefinition)

const mongodb = require('mongodb')
const mongoClient = mongodb.MongoClient
const ObjectId = mongodb.ObjectId; 
let db

const HOST = '0.0.0.0'
const PORT = 3000
const DB_HOST = '127.0.0.1'
const DB_PORT = 27017
const DB_USER = 'admin'
const DB_PASSWORD = 'password'
const DATABASE_NAME = 'bookshop'

function mapBook(book) {
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
	return new Promise(function(resolve, reject) {
		db.collection('books').find({}).toArray((err, result) => {
			if (err) {
				reject(error);
			} 

			resolve(result.map(item => mapBook(item)));
		})
	})
}

function findBook(id) {
	return new Promise(function(resolve, reject) {
		db.collection('books').findOne({_id: new ObjectId(id)}, (err, result) => {
			if (err) {
				reject(err);
			} 

			resolve(mapBook(result));
		})
	})
}

function addBook(book) {
	return new Promise(function(resolve, reject) {
		db.collection('books').insertOne(book, (err, result) => {
			if (err) {
				reject(err);
			} 

			resolve({insertedId: result.insertedId.toString()});
		})
	})
}

function removeBook(id) {
	return new Promise(function(resolve, reject) {
		db.collection('books').deleteOne({_id: new ObjectId(id)}, (err, result) => {
			if (err) {
				reject(err);
			} 

			resolve();
		})
	})
}

function List (_, cb) {
	getAllBooks()
	.then(res => {
		return cb(null, {books: res})
	})
}

function Find (call, cb) {
	findBook(call.request.id)
	.then(res => {
		return cb(null, res)
	})
}

function Add(call, cb) {
	addBook(call.request)
	.then(res => {
		return cb(null, res)
	})
}

function Remove(call, cb) {
	removeBook(call.request.id)
	.then(() => {
		return cb(null, {})
	})
}

// mongoClient.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}`, (err, client) => {
mongoClient.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@mongodb:${DB_PORT}`, (err, client) => {
	if (err) {
		console.error('error connecting: ' + err.stack);
		return;
	}

	console.log('connected to mongodb')

	db = client.db(DATABASE_NAME)

	const server = new grpc.Server()
	server.addService(BookshopDefinition.BookshopService.service, {List, Find, Add, Remove})

	server.bindAsync(`${HOST}:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
		if (err) {
			console.error('Error binding grpc: ' + err.stack);
			return;
		}
	
		server.start()
		console.log(`Server listening to port ${port}...`)
	})

});
