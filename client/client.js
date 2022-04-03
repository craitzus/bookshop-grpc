const path = require('path')
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader')
const filepath = path.resolve(__dirname, '../proto/bookshop.proto')
const packageDefinition = protoLoader.loadSync(filepath)
const BookshopDefinition = grpc.loadPackageDefinition(packageDefinition);

const HOST = 'localhost'
const PORT = 9000

const client = new BookshopDefinition.BookshopService(`${HOST}:${PORT}`, grpc.credentials.createInsecure())

async function list() {
	return new Promise((resolve, reject) => {
		client.list({}, (err, res) => {
			if (err) {
				reject(err)
			}
				
			resolve(res.books)			
		})
	})
}

async function find(id) {
	return new Promise((resolve, reject) => {
		client.find({id}, (err, res) => {
			if (err) {
				reject(err)
			}

			if (!res || !res.id) { 
				reject('Book not found')
			}
					
			resolve(res)			
		})
	})
}

async function add(book) {
	return new Promise((resolve, reject) => {
		client.add(book, (err, res) => {
			if (err) {
				reject(err)
			}

			if (!res || !res.id) { 
				reject('Error adding book')
			}
					
			resolve(res)			
		})
	})
}

async function remove(id) {
	return new Promise((resolve, reject) => {
		client.remove({id}, (err, res) => {
			if (err) {
				reject(err)
			}
					
			resolve()			
		})
	})
}

(async () => {
	const addedBook = await add({
		title: 'The Mythical Man-Month', 
		author: 'Phillip K. Brooks', 
		publishDate: '1980-04-01 12:04:00', 
		pages: 339, 
		price: 52.00
	})
	console.log('Book added', addedBook)

	let books = await list()
	console.log('Books list', books)

	const book = await find(1)
	console.log('Book found', book)

	await remove(addedBook.id)
	console.log('Book removed', addedBook.id)

	books = await list()
	console.log('Books list', books)
})()