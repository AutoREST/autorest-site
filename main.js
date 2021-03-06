var express = require('express');
var favicon = require('serve-favicon');
var uuid = require('uuid/v4');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var path = require('path');
var mongoose = require('mongoose');

var uploadsPath = path.join(__dirname, 'stage','uploads');
var resultsPath = path.join(__dirname, 'stage','results');
var generationPath = path.join(__dirname, 'stage','generation');

var app = express();
// var updater = require('./bin/updater');
var order = require('./routers/order');
order.setStageFolder(uploadsPath);
var execution = require('./routers/execution');
execution.setStageFolder(generationPath);

var port = process.env.PORT || 3000;
var connection_string = process.env.DATABASE || 'mongodb://localhost/autorestDB';

mongoose.Promise = global.Promise;
mongoose.connect(connection_string);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log('Connection to MongoDB estabelished');
});

app.use(cookieParser())
app.use(session({
	secret: 'is there any secret',
	resave: true,
	saveUninitialized: true
}));
app.use(morgan('dev'));
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(methodOverride());
app.use(express.static(path.join(__dirname,'build','Release')));
app.use('/assets/samples', express.static(path.join(__dirname,'samples')));
app.use(favicon(path.join(__dirname,'favicon.ico')));
app.use(order);
app.use(execution);
app.get('/', function (req, res) {
	res.render('index');
});
app.get('/samples', function (req, res) {
	var samples = [];
	samples.push({name:'ClassDiagram2', xml:'ClassDiagram2.xml', json:'ClassDiagram2.json', png:'ClassDiagram2.png'});
	samples.push({name:'ClassDiagram3', xml:'ClassDiagram3.xml', json:'ClassDiagram3.json', png:'ClassDiagram3.png'});
	samples.push({name:'ClassDiagram4', xml:'ClassDiagram4.xml', json:'ClassDiagram4.json', png:'ClassDiagram4.png'});
	samples.push({name:'ClassDiagram5', xml:'ClassDiagram5.xml', json:'ClassDiagram5.json', png:'ClassDiagram5.png'});
	samples.push({name:'ClassDiagram6', xml:'ClassDiagram6.xml', json:'ClassDiagram6.json', png:'ClassDiagram6.png'});
	samples.push({name:'RunningExample', xml:'RunningExample.xml', json:'RunningExample.json', png:'RunningExample.png'});
	res.render('samples',{samples: samples});
});
/*
var executionCore = require('./bin/executionCore');
executionCore.setStageFolder(resultsPath);
executionCore.startTasks();
app.post('/reset-crons', function(req, res) {
	try {
		var options = {};
		if(req.body.parserCron)
			options.parserCron = req.body.parserCron;
		if(req.body.generatorCron)
			options.generatorCron = req.body.generatorCron;
		executionCore.refreshCrons(options);
		res.status(200).send();
	} catch (e) {
		res.status(500).send();
	}
});
//*/
/*
var updateOptions = {
    userAgent: 'lasaro-dumer',
    binaries: new Map()
}

updateOptions.binaries.set('restApiGenerator', {
    binName: 'rest-api-generator-with-dependencies.jar',
    latestReleaseURL: 'https://api.github.com/repos/AutoREST/rest-api-generator/releases/latest'
});
updateOptions.binaries.set('astaXmlParser', {
    binName: 'astah-xml-parser.jar',
    latestReleaseURL: 'https://api.github.com/repos/AutoREST/astah-xml-parser/releases/latest'
});
app.get('/bin/cleanup', function (req, res) {
    var myUpdater = new updater(updateOptions);
    myUpdater.on('error', function(info){ res.send(info); });
    myUpdater.on('end', function(info){ res.send(info); });
    myUpdater.cleanUp();
});
app.get('/bin/update', function (req, res) {
    var myUpdater = new updater(updateOptions);
    myUpdater.on('end', function(info){ res.send(info); });
    myUpdater.checkLatestVersion();
});
*/
app.listen(port, function () {
    console.log('AutoREST site listening on port '+port+'!');
});
