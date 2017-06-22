var express = require('express');
var router = express.Router();
var path = require('path');
var formidable = require('formidable');
var fs = require('fs-extra');
var uuid = require('uuid/v4');
var Order = require('../models/order');
var executionCore = require('../bin/executionCore');

var generationStage = __dirname;

var StatusEnum = Object.freeze(
	{
		ERROR: -1,
		NOTPARSED: 0,
		PARSED: 1,
		GENERATED: 2
	}
);

router.setStageFolder = function(folderPath) {
	generationStage = folderPath;
	fs.ensureDirSync(generationStage);
	console.log(`Stage folder for generation: ${generationStage}`);
};

router.post('/generate', function(req, res){
	//based on https://coligo.io/building-ajax-file-uploader-with-node/
	// create an incoming form object
	var form = new formidable.IncomingForm();
	// specify that we don't want to allow the user to upload multiple files in a single request
	form.multiples = false;
	// store all uploads in generationStage
	form.uploadDir = generationStage;
	fs.ensureDirSync(form.uploadDir);

	var status = StatusEnum.NOTPARSED;
	var sourceFilePath = '';
	var apiOptions = '';
	var apiId = uuid();
	executionCore.setStageFolder(form.uploadDir);

	// every time a file has been uploaded successfully,
	// rename it to it's orignal name
	form.on('file', function(field, file) {
		var extName = path.extname(file.name);
		var fileName = path.basename(file.name, extName);
		fileName = `${fileName}${apiId}${extName}`;
		sourceFilePath = path.join(form.uploadDir, fileName);
		console.log(`extName: ${extName}\nnewPath: ${sourceFilePath}\nfilePath:${file.path}`);
		if(extName === '.xml'){
			status = StatusEnum.NOTPARSED;
		}
		else if (extName === '.json') {
			status = StatusEnum.PARSED;
		}
		else {
			status = StatusEnum.ERROR;
		}
		console.log(`status: ${status}`);
		if(status != StatusEnum.ERROR)
			fs.moveSync(file.path, sourceFilePath);
		else
			fs.removeSync(file.path);
	});

	form.on('field', function(field, value){
		if(field === 'options'){
			var opts = JSON.parse(value);
			apiOptions = JSON.stringify(opts);
		}
		else {
			console.log(`unexpected field: ${field}`);
		}
	});

	// log any errors that occur
	form.on('error', function(err) {
		status = StatusEnum.ERROR;
		console.log('An error has occured: \n' + err);
	});

	// once all the files have been uploaded, send a response to the client
	form.on('end', function() {
		console.log('Upload completed');
		if(status != StatusEnum.ERROR){
			if(status === StatusEnum.NOTPARSED)
				router.parseXML(apiId, sourceFilePath, apiOptions, res);
			else if (status === StatusEnum.PARSED)
				router.generateApi(apiId, sourceFilePath, apiOptions, res);
		}
		else {
			res.status(400).end('Failed to create API order in AutoREST');
		}
	});

	// parse the incoming request containing the form data
	form.parse(req);

});

router.parseXML = function(apiId, xmlPath, apiOptions, res) {
	executionCore.executeAstaXmlParser(apiId, xmlPath, function(err, jsonPath) {
		if(err) res.status(500).send({message:'Error parsing XML to JSON Schema', error:err});
		else if(jsonPath) router.generateApi(apiId, jsonPath, apiOptions, res, xmlPath);
	})
}

router.generateApi = function(apiId, jsonPath, apiOptions, res, xmlPath) {
	executionCore.executeRestApiGenerator(apiId, jsonPath, apiOptions, function(err, zipPath) {
		if(err) res.status(500).send({message:'Error generating API', error:err});
		else if(zipPath){
			var newOrder = new Order({
				_id: apiId,
				options: apiOptions,
				APIName: JSON.parse(apiOptions).APIName,
				zipPath: zipPath,
				status: StatusEnum.GENERATED
			});
			if(xmlPath)
				newOrder.xmlPath = xmlPath;
			newOrder.save(function(err, result) {
				if(err) res.status(500).send({message:'Error saving API',error:err});
				else res.status(200).send({message:'API generated successfully', url:`/order/zip/${newOrder._id}`});
			});
		}
	})
}

router.get('/java-version', function(req, res) {
	executionCore.testJavaVersion(function(err, result) {
		res.send({err:err, result:result});
	})
})
module.exports = router;
