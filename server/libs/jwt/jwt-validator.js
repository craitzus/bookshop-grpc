var jwt = require('jsonwebtoken');
var fs = require('fs');

function validateWithPubKeyString(token, pubkey) {
	try {
		jwt.verify(token, pubkey);
	} catch (err) {
		throw {
			code: err.name,
			message: err.message
		}
	}	
}

function validateWithPubKeyFile(token, pubkeyFilePath) {
	try {
		jwt.verify(token, fs.readFileSync(pubkeyFilePath));
	} catch (err) {
		throw {
			code: err.name,
			message: err.message
		}
	}	
}

 module.exports = {
	validateWithPubKeyString,
	validateWithPubKeyFile
 }
