$(document).ready(function() {
	console.log('Hi from ready');
})

var _isSuccessCode = function(status) {
	return (status >= 200 && status < 300) || status === 304;
}

var app = angular.module('modSiteApp', ['ngSanitize', 'blockUI'])
	.directive("fileread", [function () {
	//big thanks to: https://stackoverflow.com/questions/17063000/ng-model-for-input-type-file
	return {
		scope: {
			fileread: "="
		},
		link: function (scope, element, attributes) {
			element.bind("change", function (changeEvent) {
				scope.$apply(function () {
					scope.fileread = changeEvent.target.files[0];
					// or all selected files:
					// scope.fileread = changeEvent.target.files;
				});
			});
		}
	}
}]);;

app.controller('siteAppController', function ($scope, $timeout, $http, $window, blockUI) {
	$scope.options = {
		APIName: 'name',
		DataBaseName: 'apiDB',
		APIRepoURL: 'www.github.com'
	};
	$scope.readyToSend = false;
	$scope.classes = {info:'alert-info', error:'alert-danger', success:'alert-success'};
	$scope.alerts = [];
	$scope.addAlert = function(cls, msg, title) {
		var alert = {id:Math.random(),class:cls,text:msg};
		alert.title = title || '';
		$scope.alerts.push(alert);
	}
	$scope.removeAlert = function(alert) {
		var index = $scope.alerts.indexOf(alert);
		if (index > -1)
			$scope.alerts.splice(index, 1);
	}
	$scope.createApiRequest = function() {
		if($scope.sourceFile)
			$scope.sendApiRequest({alias:'sourceFile',file:$scope.sourceFile});
		else
			$scope.addAlert($scope.classes.error, 'Choose a file and try again');
	}
	/**
	 * Transforms the server response
	 * @param {*} response
	 * @param {Object} headers
	 * @returns {*}
	 * @private
	 */
	$scope._transformResponse = function(response, headers) {
		var headersGetter = this._headersGetter(headers);
		$http.defaults.transformResponse.forEach( (transformFn) => {
			response = transformFn(response, headersGetter);
		});
		return response;
	}
	/**
	 * Parsed response headers
	 * @param headers
	 * @returns {Object}
	 * @see https://github.com/angular/angular.js/blob/master/src/ng/http.js
	 * @private
	 */
	$scope._parseHeaders = function(headers) {
		var parsed = {}, key, val, i;

		if(!headers) return parsed;

		headers.split('\n').forEach( (line) => {
			i = line.indexOf(':');
			key = line.slice(0, i).trim().toLowerCase();
			val = line.slice(i + 1).trim();

			if(key) {
				parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
			}
		});

		return parsed;
	}
	/**
	 * Returns function that returns headers
	 * @param {Object} parsedHeaders
	 * @returns {Function}
	 * @private
	 */
	$scope._headersGetter = function(parsedHeaders) {
		return (name) => {
			if(name) {
				return parsedHeaders[name.toLowerCase()] || null;
			}
			return parsedHeaders;
		};
	}
	$scope.downloadURI = function (uri, name) {
		var link = document.createElement("a");
		link.download = name;
		link.href = uri;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		delete link;
	}
	$scope.generateApi = function() {
		if($scope.sourceFile)
			$scope.generateApiBlock({alias:'sourceFile',file:$scope.sourceFile});
		else
			$scope.addAlert($scope.classes.error, 'Choose a file and try again');
	}
	// A function called from user interface, which performs an async operation.
	$scope.generateApiBlock = function(item) {
		// Block the user interface
		blockUI.start('Generating your API');
		//this function was heavily based on one in angular-file-upload
		var xhr = new XMLHttpRequest();
		var sendable = new FormData();
		if(typeof(item.file.size) != 'number') {
			$scope.addAlert($scope.classes.error, 'The file specified is no longer valid');
			return;
		}
		sendable.append('options', JSON.stringify($scope.options));
		sendable.append(item.alias, item.file, item.file.name);

		xhr.upload.onprogress = (event) => {
			// var progress = Math.round(event.lengthComputable ? event.loaded * 100 / event.total : 0);
			// $scope.$apply(function(){$scope.addAlert($scope.classes.info, `Upload progress: ${progress}%`)});
		};

		xhr.onload = () => {
			if(_isSuccessCode(xhr.status)){
				var headers = $scope._parseHeaders(xhr.getAllResponseHeaders());
				var response = $scope._transformResponse(xhr.response, headers);
				var url = $window.location.origin + response.url;
				$scope.downloadURI(url, `${$scope.options.APIName}.zip`);
			}
			else {
				$scope.$apply(function(){$scope.addAlert($scope.classes.error, xhr.response)});
			}
			$scope.$apply(function(){blockUI.stop();});
		};

		xhr.onerror = () => {
			$scope.$apply(function(){$scope.addAlert($scope.classes.error, xhr.response)});
		};

		xhr.onabort = () => {
			$scope.$apply(function(){blockUI.stop();});
			$scope.$apply(function(){$scope.addAlert($scope.classes.info, xhr.response, 'Aborted')});
		};

		xhr.open('POST', '/generate', true);
		xhr.send(sendable);
	};
	$scope.sendApiRequest = function(item) {
		//this function was heavily based on one in angular-file-upload
		var xhr = new XMLHttpRequest();
		var sendable = new FormData();
		if(typeof(item.file.size) != 'number') {
			$scope.addAlert($scope.classes.error, 'The file specified is no longer valid');
		}
		sendable.append('options', JSON.stringify($scope.options));
		sendable.append(item.alias, item.file, item.file.name);

		xhr.upload.onprogress = (event) => {
			var progress = Math.round(event.lengthComputable ? event.loaded * 100 / event.total : 0);
			$scope.$apply(function(){$scope.addAlert($scope.classes.info, `Upload progress: ${progress}%`)});
		};

		xhr.onload = () => {
			if(_isSuccessCode(xhr.status)){
				$scope.$apply(function(){$scope.addAlert($scope.classes.success, xhr.response, 'Success!')});
			}
			else {
				$scope.$apply(function(){$scope.addAlert($scope.classes.error, xhr.response)});
			}
		};

		xhr.onerror = () => {
			$scope.$apply(function(){$scope.addAlert($scope.classes.error, xhr.response)});
		};

		xhr.onabort = () => {
			$scope.$apply(function(){$scope.addAlert($scope.classes.info, xhr.response, 'Aborted')});
		};

		xhr.open('POST', '/upload', true);
		xhr.send(sendable);
	}
});

app.controller('ordersController', function ($scope) {

});
app.controller('orderController', function ($scope) {

});
