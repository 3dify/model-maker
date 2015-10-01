var fs = require('fs');
var path = require('path');
var watch = require('watch');
var events = require('events');
var childProcess = require('child_process');

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
		var zipFilename  = path.join(process.cwd(),dir+".zip");
		var options = {
			cwd : dir
		};

		var args = [
			zipFilename,
			'*.obj',
			'*.mtl',
			'*.jpg'
		];

		data.zipFilename = zipFilename;
		data.name = "name";
		data.tags = config.tags || "";
		var process = childProcess.execSync('zip'+args.join(' '),options,zipComplete.bind(null,data));


	}

	var zipComplete = function(metadata, error, stdout, stderr){
		if(error){
			console.error(error);
			process.exit(1);
		}

		uploadToSketchfab(metadata);
	}

	var uploadToSketchfab = function(metadata){
		sketchfab.upload({
			file: metadata.zipFilename,
			name: metadata.name,
			description: "",
			tags: ""
		},function(err,result){
			if(err){
				console.error(err);
				process.exit(1);
			}
			result.on('success',uploadComplete);
			result.on('progress',function(p){
				console.log(p);
			});
			result.on('error',function(error){
				console.error(error);
				process.exit(1);
			});

		});
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

