$(document).ready(function() {
	console.log('Hi from ready');
})

var _isSuccessCode = function(status) {
	return (status >= 200 && status < 300) || status === 304;
}

var app = angular.module('modSiteApp', ['ngSanitize'])
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

app.controller('siteAppController', function ($scope) {
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
