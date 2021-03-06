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

router.post('/toggle-logs', function(res, res) {
	var logsEnabled = executionCore.toggleLogs();
	res.send({logsEnabled: logsEnabled});
})

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
	var selectedPackage = undefined;
	var apiId = uuid();
	var errorMessage = undefined;
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
			errorMessage = 'Invalid file. Only .xml and .json accepted.';
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
		if (field === 'selectedPackage') {
			selectedPackage = value;
		}
		else {
			console.log(`unexpected field: ${field}`);
		}
	});

	// log any errors that occur
	form.on('error', function(err) {
		status = StatusEnum.ERROR;
		errorMessage = err;
		console.log('An error has occured: \n' + err);
	});

	// once all the files have been uploaded, send a response to the client
	form.on('end', function() {
		console.log('Upload completed');
		if(status != StatusEnum.ERROR){
			if(status === StatusEnum.NOTPARSED){
				if(selectedPackage)
					router.parseXML(apiId, sourceFilePath, selectedPackage, apiOptions, res);
				else
					router.listPackages(apiId, sourceFilePath, apiOptions, res);
			}
			else if (status === StatusEnum.PARSED)
				router.generateApi(apiId, sourceFilePath, apiOptions, res);
		}
		else {
			res.status(400).send({message:'Failed to create API order in AutoREST', error:errorMessage});
		}
	});

	// parse the incoming request containing the form data
	form.parse(req);

});

router.listPackages = function(apiId, xmlPath, apiOptions, res) {
	executionCore.astahXmlParserGetPackages(apiId, xmlPath, function(err, packagesOut) {
		if(err) res.status(500).send({message:'Error extracting packages.', error:err});
		else if(packagesOut){
			res.status(200).send({message:'Select a package from the list', packages:packagesOut.packages});
		}
		else {
			res.status(500).send({message:'Parser didn\'t return a list of packages'});
		}
	})
}

router.parseXML = function(apiId, xmlPath, selectedPackage, apiOptions, res) {
	executionCore.executeAstahXmlParser(apiId, xmlPath, selectedPackage, function(err, jsonPath) {
		if(err) res.status(500).send({message:'Error parsing XML to JSON Schema', error:err});
		else if(jsonPath){
			if(fs.existsSync(jsonPath))
				router.generateApi(apiId, jsonPath, apiOptions, res, xmlPath);
			else
				res.status(500).send({message:'The parsed \'.json\' doesn\'t exist'});
		}
		else {
			res.status(500).send({message:'Parser didn\'t return a \'.json\' path'});
		}
	})
}

router.generateApi = function(apiId, jsonPath, apiOptions, res, xmlPath) {
	executionCore.executeRestApiGenerator(apiId, jsonPath, apiOptions, function(err, zipPath) {
		if(err) res.status(500).send({message:'Error generating API', error:err});
		else if(zipPath){
			if(fs.existsSync(jsonPath)){
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
			else
				res.status(500).send({message:'The generator \'.zip\' doesn\'t exist'});
		}
		else {
			res.status(500).send({message:'Generator didn\'t return a \'.zip\' path'});
		}
	})
}

router.get('/java-version', function(req, res) {
	executionCore.testJavaVersion(function(err, result) {
		res.send({err:err, result:result});
	})
})
module.exports = router;
