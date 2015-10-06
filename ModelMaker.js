var fs = require('fs');
var path = require('path');
var events = require('events');
var childProcess = require('child_process');
var net = require('net');

var watch = require('watch');
var glob = require("glob");

var SketchFab = require('node-sketchfab');

module.exports = function(config){

	var exports = {};

	var eventEmitter = new events.EventEmitter();

	var sketchfab = new SketchFab(config.sketchfabCredencials);

	var processDir = exports.process = function(dir){
		//find files
		dir = resolveDirectory(dir);

		checkFiles(dir);
		eventEmitter.once('allFilesFound',getMetadata);
		eventEmitter.once('gotMetadata',makeZip.bind(null,dir));
		eventEmitter.once("gotMetadata",showInViewer);
		//eventEmitter.once('zipComplete',uploadToSketchfab);
		//eventEmitter.once("uploadComplete",writeLogFile);
	}

	var cancelProcessDir = function(){
		eventEmitter.removeAllListeners('allFilesFound');
		eventEmitter.removeAllListeners('gotMetadata');
		eventEmitter.removeAllListeners('zipComplete');
	}

	var watchDir = exports.watch = function(dir){
		dir = resolveDirectory(dir);
		watch.watchTree(dir, function(f, curr, prev){
			if( curr && prev === null ){
				console.log(f);
				var dir = path.dirname(f);

			}
		});
	}

	var checkFiles = function(dir){
		
		hasFiles(dir,["*.obj","*.jpg","*.mtl","*.json"]).then(function(results){
			console.log( results );
			eventEmitter.emit("allFilesFound",dir,results);
		},function(reason){
			console.log( "failed" );
			console.log(reason+" not found");
		}).catch(function(err){
			console.log(err.stack);
			//console.trace();
			//throw err;
		});
	}

	var hasFiles = function(dir,files){
		files = files.map(function(file){ return path.join(dir,file); })
		var globs = files.map(function(file){  

			return new Promise( function(resolve,reject){
				glob(file, function(err, files){
					if(err) throw err;
					else if( files.length==0 ) reject(file);
					else resolve(files[0]);
				});
			});
		});
		return Promise.all(globs);
	}

	var getMetadata = function(dir,files){
		fs.readFile(files[3],'utf8',function(err, data){
			if(err){
				cancelProcessDir();
				eventEmitter.emit('fileFail',err);
			}
			try{
				var metadata = JSON.parse(data);
			}
			catch(e){
				eventEmitter.emit('fileFail',e);				
			}

			metadata.srcpath = dir;
			eventEmitter.emit("gotMetadata", files, metadata);
		});
	}

	var showInViewer = function(files,metadata){
		var client = net.connect({port: 8001}, function() {
			console.log('connected to server!');
			client.write("{0},{1}\n".format(files[0],files[1]));
			client.on('data', function(data) {
				console.log(data.toString());
				client.end();
			});
		});
		client.on('error',function(e){ 
			console.log("Warning: Could not connect to viewer".yellow);
		});
	}

	var makeZip = function(dir,files,metadata){

		var zipFilename  = path.join(dir,"sketchfab.zip");
		var options = {
			cwd : dir
		};

		var args = files.concat();

		args.pop();
		args.unshift(zipFilename);

		metadata.zipFilename = zipFilename;
		
		var process = childProcess.exec('zip '+args.join(' '),options,zipComplete.bind(null,metadata));


	}

	var zipComplete = function(metadata, error, stdout, stderr){
		if(error){
			console.error(error);
			process.exit(1);
		}

		console.log("Creating zip");
		console.log(stdout);
		eventEmitter.emit('zipComplete',metadata);

	}

	var uploadToSketchfab = function(metadata){
		
		sketchfab.upload({
			file: metadata.zipFilename,
			name: metadata["scan name"] || "",
			description: metadata["description"] || "",
			tags: config.tags || ""
		},function(err,result){
			if(err){
				console.error(err);
				process.exit(1);
			}
			result.on('success',uploadComplete.bind(null,metadata));
			result.on('progress',function(p){
				console.log("Uploading to Sketchfab {0}% Complete".format(Math.round(p)));
			});
			result.on('error',function(error){
				console.error(error);
				process.exit(1);
			});

		});
	}

	var uploadComplete = function(metadata,url){

		metadata.url = url;
		//distpatch upload complete event
		eventEmitter.emit('uploadComplete',metadata);

		console.log("url created: {0}".format(url));
	}

	var writeLogFile = function(metadata){
		metadata["dirname"] = path.basename( metadata["srcpath"] );
		metadata["description"] = encodeURIComponent( metadata["description"] );

		var fields = config.fields;

		var entries = fields.map(function(key){ 
			return metadata[key] || "missing";
		});

		if( console.log ) fs.stat(config.log,function(err,stats){

			if(stats.isDirectory()){
				eventEmitter("fileFail",new Error("config.log file {0} was a directroy".format(config.log)));
				return;
			}

			var entry = entries.join(",")+"\r\n";
			/* If the file doesn't exist, add field header to begining of new file */
			if(err){
				entry = fields.join(",")+"\r\n"+entry;
			}
			fs.appendFile(config.log, entry);

		});

		/*[
			metadata["dirname"],
			metadata["dirname"] || "missing",
			metadata["scan name"] || "missing",
			metadata["description"] || "missing",
			metadata["email"] || "missing",
			metadata["phone"] || "missing",
			metadata["twitter"] || "missing",
			metadata["url"]
		];*/

	}

	exports.enableEmail = function(){
		eventEmitter.on('uploadComplete',function(){

		});
	}

	exports.enablePrint = function(){
		eventEmitter.on('uploadComplete',function(){

		});
	}

	exports.on = function(event,callback){
		eventEmitter.on(event,callback);
	}

	var resolveDirectory = function(dir){

		var resolvedDir = dir;

		if( !fs.existsSync(resolvedDir) ){
			eventEmitter.emit("fileFail","path {0} not found".format(dir));			
		}

		if( path.isAbsolute(dir) ){
			resolvedDir = dir;
		}
		else {
			resolvedDir = fs.realpathSync(dir);
		}

		if(!fs.statSync(resolvedDir).isDirectory()){
			eventEmitter.emit("fileFail","path {0} given was not a directory",format(dir));						
		}

		if(resolvedDir.charAt(resolvedDir.length-1)=="/"){
			resolvedDir = resolvedDir.slice(0,-1);
		}

		return resolvedDir;

	}

	return exports;
};

