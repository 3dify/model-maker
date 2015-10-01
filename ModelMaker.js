var fs = require('fs');
var path = require('path');
var watch = require('watch');
var events = require('events');

var SketchFab = require('sketchfab');

module.exports = function(config){

	var exports = {};

	var eventEmitter = new events.EventEmitter();

	var sketchfab = new SketchFab(config.sketchfabCredencials);

	var process = exports.process = function(dir){
		//find files

		//upload to sketchFab return url

	}

	var makeZip = function(dir){
		var zipFilename  = dir+".zip";
		var options = {
			cwd : dir
		};
		var args = [
			zipFilename,
			'*.obj',
			'*.mtl',
			'*.jpg'
		];

		cp.execSync('zip'+args.join(' '),options,zipComplete);

	}

	var zipComplete = function(){

	}

	var uploadToSketchfab = function(){

	}

	var uploadComplete(error, url){

		if(error){
			console.error(error);
			process.exit(1);
		}

		//distpatch upload complete event
		eventEmitter.emit('uploadComplete',url);

	}

	var watch = exports.watch = function(dir){

	}

	exports.enableEmail = function(){
		eventEmitter.on('uploadComplete',function(){

		});
	}

	exports.enablePrint = function(){
		eventEmitter.on('uploadComplete',function(){

		});
	}

	return exports;
};

