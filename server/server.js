const path = require('path');

const grpc = require(path.resolve(__dirname, './libs/grpc/grpc-helper'));
const mongo = require(path.resolve(__dirname, './libs/mongodb/mongodb-helper'));

(async () => {
	try {
		await mongo.connect();
		grpc.init();
	} catch (err) {
		console.log(`ERR: ${err}`)
	}
})();

