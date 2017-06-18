var express = require('express');
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

var app = express();
// var updater = require('./bin/updater');
var order = require('./routers/order');
order.setStageFolder(uploadsPath);

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
app.use(order);
app.get('/', function (req, res) {
	res.render('index');
});
/*
var executionCore = require('./bin/executionCore');
executionCore.setStageFolder(resultsPath);
app.get('/run/rest-api-generator', function(req, res) {
	var reqId = uuid();
	var inputJSON = path.join(__dirname,'bin', 'advanced.json');
	var inputOptions = '';
	executionCore.executeRestApiGenerator(reqId, inputJSON, inputOptions, function(err, apiPath) {
		if(err) res.status(500).send(err);
		else res.send(apiPath);
	});
});
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
