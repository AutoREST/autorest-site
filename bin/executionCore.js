var fs = require('fs-extra');
var path = require('path');
var util = require("util");
var events = require('events');
var exec = require('child_process').exec;
var Order = require('../models/order');
var cron = require('node-cron');

var defaultparserCron = '*/10 * * * * *';
var defaultgeneratorCron = '*/10 * * * * *';

function ExecutionCore() {
	var parserJarPath = path.join(__dirname, 'astah-xml-parser.jar');
	var generatorJarPath = path.join(__dirname, 'rest-api-generator.jar');
	var extName = '.zip';
	var resultDirectory = __dirname;
	var parserCron = process.env.PARSER_CRON || defaultparserCron;
	var generatorCron = process.env.GENERATOR_CRON || defaultgeneratorCron;
	var tasks = [];
	var obj = this;
	var logsEnabled = false;

	this.executeAstaXmlParser = function(reqId, inputXML, cb) {
		var outputFile = path.basename(inputXML, '.xml') + '.json';
		outputFile = path.join(resultDirectory, outputFile);
		var command = `java -jar ${parserJarPath} "${inputXML}" "${outputFile}"`;
		var child = exec(command,
				function(error, stdout, stderr) {
					try {
						if (error !== null) {
							if(logsEnabled) console.log(`Error -> \n${error}`);
							cb(error);
						}
						else if (stderr) {
							if(logsEnabled) console.log(`StdError -> \n${stderr}`);
							cb(stderr);
						}
						else {
							if(logsEnabled) console.log(`Output -> \n${stdout}`);
							cb(null, outputFile);
						}
					} catch (e) {
						cb(e);
					}
				});
	};

	this.executeRestApiGenerator = function(reqId, inputJSON, inputOptions, cb) {
		var outputRegex = /API saved in: ([\w\/\-\.]*)/;
		inputOptions = inputOptions.replace(/"/g,'\\\"');
		var command = `java -jar ${generatorJarPath} "${inputJSON}" "${inputOptions}"`;
		var child = exec(command,
				function(error, stdout, stderr) {
					try {
						if (error !== null) {
							if(logsEnabled) console.log(`Error -> \n${error}`);
							cb(error);
						}
						else if (stderr) {
							if(logsEnabled) console.log(`StdError -> \n${stderr}`);
							cb(stderr);
						}
						else {
							if(logsEnabled) console.log(`Output -> \n${stdout}`);
							var apiPath = stdout.replace(outputRegex, '$1').replace('\n','');
							var fileName = path.basename(apiPath, extName);
							fileName = `${fileName}-${reqId}${extName}`;
							var newPath = path.join(resultDirectory, fileName);
							fs.moveSync(apiPath, newPath, {overwrite:true});
							cb(null, newPath);
						}
					} catch (e) {
						cb(e);
					}
				});
	};

	this.setStageFolder = function(folderPath) {
		resultDirectory = folderPath;
		fs.ensureDirSync(resultDirectory);
		console.log(`Stage folder for results: ${resultDirectory}`);
	};

	var parserBusy = false;
	var queryAndExecuteParser = function() {
		if(!parserBusy){
			if(!fs.existsSync(parserJarPath))
				return console.log(`JAR ${parserJarPath} not available`);
			parserBusy = true;
			var pending = 0;//it's silly, but will do the work :)
			if(logsEnabled) console.log('querying and executing parser');
			Order.find({status: 0}, function(err, orders) {
				if(err) console.error(err);
				if (orders && orders.length > 0) {
					for (var order of orders) {
						pending++;
						obj.executeAstaXmlParser(order._id, order.xmlPath, function(err, result) {
							if(err) console.error(err);
							else if(result){
								if(logsEnabled) console.log(result);
								order.jsonPath = result;
								order.status = 1;
								order.save();
							}
							pending--;
							if(pending<=0)
								parserBusy = false;
						})
						return;
					}

					if(pending<=0)
						parserBusy = false;
				}
				else {
					if(logsEnabled) console.log('No orders pending parsing found');
					parserBusy = false;
				}
			});
		}
	}

	var generatorBusy = false;
	var queryAndExecuteGenerator = function() {
		if(!generatorBusy){
			if(!fs.existsSync(generatorJarPath))
				return console.log(`JAR ${generatorJarPath} not available`);
			generatorBusy = true;
			var pending = 0;//it's silly, but will do the work :)
			if(logsEnabled) console.log('querying and executing generator');
			Order.find({status: 1}, function(err, orders) {
				if(err) console.error(err);
				if (orders && orders.length > 0) {
					for (var order of orders) {
						pending++;
						obj.executeRestApiGenerator(order._id, order.jsonPath, order.options, function(err, result) {
							if(err) console.error(err);
							else if(result){
								if(logsEnabled) console.log(result);
								order.zipPath = result;
								order.status = 2;
								order.save();
							}
							pending--;
							if(pending<=0)
								generatorBusy = false;
						})
					}

					if(pending<=0)
						generatorBusy = false;
				}
				else {
					if(logsEnabled) console.log('No orders pending generation found');
					generatorBusy = false;
				}
			});
		}
	}

	this.createTasks = function() {
		var parserTask = cron.schedule(parserCron, queryAndExecuteParser, false);
		var generatorTask = cron.schedule(generatorCron, queryAndExecuteGenerator, false);
		tasks = [];
		tasks.push({name:'ParserQueryExec', task: parserTask});
		tasks.push({name:'GenrtrQueryExec', task: generatorTask});
	};

	this.startTasks = function() {
		for (var schedule of tasks) {
			console.log(`Starting ${schedule.name}`);
			schedule.task.start();
		}
	};

	this.stopTasks = function() {
		for (var schedule of tasks) {
			console.log(`Stoping ${schedule.name}`);
			schedule.task.stop();
		}
	};

	this.refreshCrons = function(options) {
		options = options || {};
		parserCron = options.parserCron || process.env.PARSER_CRON || defaultparserCron;
		generatorCron = options.generatorCron || process.env.GENERATOR_CRON || defaultgeneratorCron;
		console.log(`Using parserCron as '${parserCron}'`);
		console.log(`Using generatorCron as '${generatorCron}'`);
		this.stopTasks();
		this.createTasks();
		this.startTasks();
	}

	this.createTasks();
	this.startTasks();
}

util.inherits(ExecutionCore, events.EventEmitter);

module.exports = new ExecutionCore();
