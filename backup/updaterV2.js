/*eslint-disable no-unused-vars, no-unused-params, unknown-require*/
var http = require('http');
var https = require('https');
var request = require('request');
var fs = require('fs-extra');
var util = require("util");
var events = require('events');

function Updater(options){
    this.handleLatestRelase = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // fs.writeFileSync(__dirname +'/response.json', JSON.stringify(response));
            var info = JSON.parse(body);
            if(info.assets){
                var found = false;
                for(var asset of info.assets)
                    if(asset.name === binaryName){
                        found = true;
                        obj.updateBinary(name, info.tag_name, asset.browser_download_url);
                        break;
                    }
                if(!found)
                    obj.updateStatus(name, {updated:false, msg: 'latest release doesn\'t have the jar: ' + binary.binName});
            }
            else{
                obj.updateStatus(name, {updated:false, msg:'no assets in latest release'});
            }
        }
        else{
            console.log('failed ' + name);
            if(!error){
                error = {
                    statusCode: response.statusCode
                };
            }
            obj.updateStatus(name, {updated:false, msg: 'failed fetching the latest release', err: error});
        }
    };

    this.prepareOption = function (targetUrl, userAgent){
        var options = {
            url: targetUrl,
            headers: {
                'User-Agent': userAgent,
                'X-Request-ID' : 'restApiGenerator'
            }
        };
        return options;
    };

    this.updateBinary = function (name, latestVersion, downloadURL){
        var update = false;
        if(fs.existsSync(obj.versionFile)){
            var currentVersion = fs.readFileSync(obj.versionFile);
            if(latestVersion > currentVersion)
                update = true;
        }
        else{
            update = true;
        }

        if(update){
            request
                .get(obj.prepareOption(downloadURL, obj.userAgent))
                .on('error', function(err) {
                    obj.updateStatus(name, {updated:false, msg: 'update failed', err:err});
                })
                .on('end', function(){
                    fs.writeFileSync(obj.versionFile, latestVersion);
                    obj.updateStatus(name, {updated:true, msg: 'version updated!', version:latestVersion});
                })
                .pipe(fs.createWriteStream(obj.jarFullName));
        }
        else{
            obj.updateStatus(name, {updated:true, msg: 'already using the latest version!', version:latestVersion});
        }
    };

    this.updateStatus = function(name, state) {
        console.log('updating status of ' + name + ' as:', state);
        obj.status[name] = state;
        var currStatus = Object.keys(obj.status).length;
        console.log('status length: ' + currStatus + ' target: ' + obj.statusTarget);
        if(obj.statusTarget === currStatus)
            obj.emit('end', obj.status);
    }

    this.checkLatestVersion = function (){
        this.statusTarget = obj.config.binaries.size;
        console.log('obj.config.binaries.size: ', this.statusTarget);
        for (var [name, bin] of obj.config.binaries) {
            console.log('requesting to : ' + name);
            var options = obj.prepareOption(bin.latestReleaseURL, obj.userAgent);
            request(options, obj.handleLatestRelase);
        }
    };

    this.cleanUp = function(){
        if(fs.exists(obj.versionFile))
            fs.removeSync(obj.versionFile);
        if(fs.exists(obj.jarFullName))
            fs.removeSync(obj.jarFullName);
        obj.emit('end',{updated:false,msg:'clean up done!'});
    };
    events.EventEmitter.call(this);
}

util.inherits(Updater, events.EventEmitter);

module.exports = Updater;
