var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var path = require('path');

var OrderSchema = new Schema({
	_id:{
		type: String,
		required: true
	},
	APIName: {
		type: String,
		required: true
	},
	options: {
		type: String
	},
	status: {
		type: Number,
		enum: [0,1,2],
		default: 0,
		required: true
	},
	xmlPath: {
		type: String
	},
	jsonPath: {
		type: String
	},
	zipPath: {
		type: String
	}
});

OrderSchema.methods.beautify = function() {
	var doc = this.toObject({ virtuals: true });

	switch (doc.status) {
		case 0:
			doc.statusText = 'Pending';
			doc.downloadLatest = `/order/xml/${doc._id}`;
			doc.forceNext = `/order/parse/${doc._id}`;
			doc.xmlFileName = path.basename(doc.xmlPath);
			doc.fileName = doc.xmlFileName;
			break;
		case 1:
			doc.statusText = 'XML parsed';
			doc.downloadLatest = `/order/json/${doc._id}`;
			doc.forceNext = `/order/generate/${doc._id}`;
			doc.jsonFileName = path.basename(doc.jsonPath);
			doc.fileName = doc.jsonFileName;
			break;
		case 2:
			doc.statusText = 'API Generated';
			doc.downloadLatest = `/order/zip/${doc._id}`;
			doc.zipFileName = path.basename(doc.zipPath);
			doc.fileName = doc.zipFileName;
			break;
	}

	return doc;
}

module.exports = mongoose.model('Order', OrderSchema);
