var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var app = express();
// var updater = require('./bin/updater');
// var uploader = require('./uploader');

var port = 3000;

app.use(cookieParser())
app.use(session({
	secret: 'is there any secret',
	resave: true,
	saveUninitialized: true
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(methodOverride());
app.use(express.static(__dirname + '/build/Release'));
// app.use(uploader);
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
});
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
