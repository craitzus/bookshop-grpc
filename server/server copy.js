const mysql = require('mysql')
const path = require('path')
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader')
const filepath = path.resolve(__dirname, '../proto/bookshop.proto')
const packageDefinition = protoLoader.loadSync(filepath)
const BookshopDefinition = grpc.loadPackageDefinition(packageDefinition)

const HOST = '0.0.0.0'
const PORT = 9850

const DB_HOST = 'localhost'
const DB_PORT = 3306
const DB_USER = 'root'
const DB_PASSWORD = 'password'
const DATABASE_NAME = 'bookshop'

function mapBook(book) {
	return !book ? [] : {
		id: book.book_id,
		title: book.title,
		author: book.author,
		publishDate: new Date(book.published_at).toISOString(),
		pages: book.pages,
		price: book.price
	}
}

function getAllBooks() {
	return new Promise(function(resolve, reject) {
		connection.query('SELECT * FROM books', function (error, results, fields) {
			if (error) {
				reject(error);
			} 

			resolve(results.map(item => mapBook(item)));
		});	
	})
}

function findBook(id) {
	return new Promise(function(resolve, reject) {
		connection.query(`SELECT * FROM books WHERE book_id = ${id}`, function (error, results, fields) {
			if (error) {
				reject(error);
			} 

			if (!results) {
				reject('Unexpected error finding book');
			} 

			resolve(mapBook(results[0]));
		});	
	})
}

function addBook(book) {
	return new Promise(function (resolve, reject) {
		let query = []
		query.push('INSERT INTO books (title, author, published_at, pages, price) ')
		query.push(`VALUES ('${book.title}', '${book.author}', '${book.publishDate}', ${book.pages}, ${book.price})`)
		query = query.join(' ')

		connection.query(query, function (error, results, fields) {
			if (error) {
				reject(error);
			} 

			resolve({
				id: results.insertId,
				...book
			});
		});	
	})
}

function removeBook(id) {
	return new Promise(function(resolve, reject) {
		connection.query(`DELETE FROM books WHERE book_id = ${id}`, function (error, results, fields) {
			if (error) {
				reject(error);
			} 

			resolve();
		});	
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

const connection = mysql.createConnection({
	host     : DB_HOST,
	user     : DB_USER,
	password : DB_PASSWORD,
	database : DATABASE_NAME
  });

connection.connect(err => {
	if (err) {
		console.error('error connecting: ' + err.stack);
		return;
	}

	console.log('connected to mysql as id ' + connection.threadId);

	const server = new grpc.Server()
	server.addService(BookshopDefinition.BookshopService.service, {List, Find, Add, Remove})
	server.bind(`${HOST}:${PORT}`, grpc.ServerCredentials.createInsecure())
	server.start()

	console.log(`Server listening to port ${PORT}...`)
});
