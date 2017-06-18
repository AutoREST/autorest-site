var express = require('express');
var router = express.Router();
var path = require('path');
var formidable = require('formidable');
var fs = require('fs-extra');
var uuid = require('uuid/v4');
var Order = require('../models/order');

var uploadDirectory = path.join(__dirname, '/uploads');

router.get('/order', function(req, res) {
	Order.find(function(err, docs) {
		if (err){
			res.status(400).send();
		}
		else{
			var orders = [];
			for (var doc of docs) {
				orders.push(doc.beautify());
			}
			res.render('orders', {orders: orders});
		}
	});
});

router.get('/order/:identifier', function(req, res) {
	Order.findById({_id:req.params.identifier},function(err, doc) {
		if (err){
			res.status(400).send();
		}
		else{
			if(doc)
				res.render('order', {order: doc.beautify()});
			else
				res.status(404).send();
		}
	});
});
router.get('/order/xml/:identifier', function(req, res) {
	Order.findById({_id:req.params.identifier},function(err, doc) {
		if (err){
			res.status(400).send();
		}
		else{
			if(doc && doc.xmlPath)
				res.sendFile(doc.xmlPath);
			else
				res.status(404).send();
		}
	});
});
router.get('/order/json/:identifier', function(req, res) {
	Order.findById({_id:req.params.identifier},function(err, doc) {
		if (err){
			res.status(400).send();
		}
		else{
			if(doc && doc.jsonPath)
				res.sendFile(doc.jsonPath);
			else
				res.status(404).send();
		}
	});
});
router.get('/order/zip/:identifier', function(req, res) {
	Order.findById({_id:req.params.identifier},function(err, doc) {
		if (err){
			res.status(400).send();
		}
		else{
			if(doc && doc.zipPath)
				res.sendFile(doc.zipPath);
			else
				res.status(404).send();
		}
	});
});
router.get('/order/parse/:identifier', function(req, res) {
	res.send('Not implemented yet');
});
router.get('/order/generate/:identifier', function(req, res) {
	res.send('Not implemented yet');
});

router.setStageFolder = function(folderPath) {
	uploadDirectory = folderPath;
	fs.ensureDirSync(uploadDirectory);
	console.log(`Stage folder for uploads: ${uploadDirectory}`);
};

router.purge('/order', function(req, res) {
	Order.find(function(err, docs) {
		if(err)
			res.status(500).send(err);
		else{
			for (var doc of docs) {
				if(doc.xmlPath)
					fs.removeSync(doc.xmlPath);
				if(doc.jsonPath)
					fs.removeSync(doc.jsonPath);
				if(doc.zipPath)
					fs.removeSync(doc.zipPath);
				doc.remove();
			}
			res.send('Orders cleaned!');
		}
	});
});

router.post('/upload', function(req, res){
	//based on https://coligo.io/building-ajax-file-uploader-with-node/
	// create an incoming form object
	var form = new formidable.IncomingForm();

	// specify that we don't want to allow the user to upload multiple files in a single request
	form.multiples = false;

	// store all uploads in uploadDirectory
	form.uploadDir = uploadDirectory;
	var newOrder = new Order({
		_id: uuid()
	});

	fs.ensureDirSync(uploadDirectory);

	// every time a file has been uploaded successfully,
	// rename it to it's orignal name
	form.on('file', function(field, file) {
		var extName = path.extname(file.name);
		var fileName = path.basename(file.name, extName);
		fileName = `${fileName}-${newOrder._id}${extName}`;
		var newPath = path.join(form.uploadDir, fileName);
		console.log(`extName: ${extName}\nnewPath: ${newPath}\nfilePath:${file.path}`);
		if(extName === '.xml'){
			newOrder.xmlPath = newPath;
			newOrder.status = 0;
		}
		else if (extName === '.json') {
			newOrder.jsonPath = newPath;
			newOrder.status = 1;
		}
		else {
			newOrder.status = -1;
		}
		console.log(`status: ${newOrder.status}`);
		if(newOrder.status >= 0)
			fs.moveSync(file.path, newPath);
		else
			fs.removeSync(file.path);
	});

	form.on('field', function(field, value){
		if(field === 'options'){
			var opts = JSON.parse(value);
			newOrder.options = JSON.stringify(opts);
			newOrder.APIName = opts.APIName;
		}
		else {
			console.log(`unexpected field: ${field}`);
		}
	});

	// log any errors that occur
	form.on('error', function(err) {
		console.log('An error has occured: \n' + err);
	});

	// once all the files have been uploaded, send a response to the client
	form.on('end', function() {
		console.log('success');
		if(newOrder.status >= 0){
			if(newOrder.APIName === undefined)
				newOrder.APIName = newOrder._id;
			newOrder.save(function(err, data){
				if(err)
					res.status(500).send(err);
				else
					res.status(201).send(`Order created successfully, Order id: <a href="/order/${newOrder._id}">${newOrder._id}</a>`);
			});
		}
		else {
			res.status(400).end('Failed to create API order in AutoREST');
		}
	});

	// parse the incoming request containing the form data
	form.parse(req);

});

module.exports = router;
