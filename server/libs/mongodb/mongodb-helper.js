require('dotenv').config()
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId; 
let db

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
	return new Promise((resolve, reject) => {
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
	return new Promise((resolve, reject) => {
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
	return new Promise((resolve, reject) => {
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
	return new Promise((resolve, reject) => {
		db.collection('books').deleteOne({_id: new ObjectId(id)}, (err, result) => {
			if (err) {
				reject(err);
			} 

			resolve();
		});
	});
}

function connect() {
	return new Promise((resolve, reject) => {
		// try connectiong to mongodb instance
		mongoClient.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}`, (err, client) => {
			if (err) {
				console.log(`error connecting: ${err.stack}`);
				process.exit(1);
			}
				
			// get database
			db = client.db(process.env.DATABASE_NAME)
		
			console.log('connected to mongodb!');

			resolve();		
	})
});
}

module.exports = {
	getAllBooks,
	findBook,
	addBook,
	removeBook,
	connect
}