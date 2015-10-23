var fs = require('fs');
var path = require('path');
var events = require('events');
var childProcess = require('child_process');
var net = require('net');

var watch = require('watch');
var glob = require("glob");
var resize = require('im-resize');

var EmailNotifications = require('./EmailNotifications');
var SketchFab = require('sketchfab');

module.exports = function(config){

	var exports = {};

	var eventEmitter = new events.EventEmitter();

	var sketchfab = new SketchFab(config.sketchfabCredencials);

	var processing = [];
	var processed = [];

	var basePath = null;
	var logFilePath;

	var emailNotification;

	var processDir = exports.process = function(dir){

		//find files

		dir = resolveDirectory(dir);

		if( !basePath ){
			setBasePath( path.dirname(dir) );
		}

		if( processed.indexOf(path.dirname(dir)) >= 0 ){
			return;
		}

		if( processing.indexOf(dir) >= 0 ){
			return;
		}

		console.log('process directory {0}'.format(dir.blue));

		processing.push(dir);
		conversionPass(dir).then( checkFiles.bind(null,dir) );
		
		eventEmitter.once('allFilesFound',getMetadata);
		eventEmitter.once('gotMetadata',makeZip.bind(null,dir));
		eventEmitter.once("gotMetadata",showInViewer);
		if( config.uploadToSketchfab ){
			eventEmitter.once('zipComplete',uploadToSketchfab);
			eventEmitter.once("uploadComplete",writeLogFile);			
			eventEmitter.once("uploadComplete",onComplete);
		}
		else {
			eventEmitter.once('zipComplete',onComplete);
		}

	}

	var watchDir = exports.watch = function(dir){
		
		dir = resolveDirectory(dir);
		setBasePath(dir);
		loadLogFile();
		watch.watchTree(dir, function(f, curr, prev){
			if( curr && prev === null ){
				var ldir = path.dirname(f);
				if(ldir[0]===".") return;
				if(ldir!=dir){
					processDir(ldir);
				}
				else {
					processDir(f);
				}
			}
		});
	}

	var conversionPass = function(dir){
		return new Promise(function(resolve,reject){
			console.log("conversionPass {0}".format(dir));
			hasFiles(dir,["*.png","*.mtl"],["*.jpg"]).then(function(files){
				console.log(files.join(", ").blue);
				var needsConverting = !!files[0] && !!files[1] && !files[2];
				if( !needsConverting ){
					resolve();
					return;
				}
				var pngFile = files[0];
				var mtlFile = files[1];
				
				var inputImage = {
					path: pngFile
				}

				var outputImage = {
					versions : [
						{ format: 'jpg' }
					]

				}

				resize( inputImage, outputImage, function(err,versions){
					if(err){
						throw err;
						return;
					}
					updateMtl( mtlFile, path.basename(pngFile), path.basename(versions[0].path), resolve);
				});
				
			},resolve);
			
		});
	}

	var updateMtl = function(mtlFile, currentImage, replacementImage, callback){
		fs.readFile(mtlFile,'utf8',function(err,contents){
			if(err) throw err;
			contents = contents.replace(currentImage,replacementImage);
			fs.writeFile(mtlFile,contents,function(err){
				if(err) throw err;
				console.log("mtl file updated");
				callback();
			});
		});
	}

	var cancelProcessDir = function(){
		eventEmitter.removeAllListeners('allFilesFound');
		eventEmitter.removeAllListeners('gotMetadata');
		eventEmitter.removeAllListeners('zipComplete');
		eventEmitter.removeAllListeners('allFilesFound');
		eventEmitter.removeAllListeners('zipComplete');
		eventEmitter.removeAllListeners("uploadComplete");
	}

	var checkFiles = function(dir){
		console.log("checkFiles");

		hasFiles(dir,["*.obj","*.jpg","*.mtl","*.json"]).then(function(results){
			console.log( results );
			eventEmitter.emit("allFilesFound",dir,results);
		},function(reason){
			console.log( "failed" );
			console.log(reason+" not found");
			processingComplete(dir);
		}).catch(function(err){
			console.log("has files failed");
			throw err;
			processingComplete(dir);
			//console.trace();
			//throw err;
		});
	}

	var processingComplete = function(dir){
		var i = processing.indexOf(dir);
		if( i === -1 ) return;
		processing.splice(i,1);
	}

	var hasFiles = function(dir,files,exceptFiles){

		files = files.map(function(file){ return path.join(dir,file); });
		if( exceptFiles ) exceptFiles = exceptFiles.map(function(file){ return path.join(dir,file); });
		else exceptFiles = [];

		files = files.concat( exceptFiles );
		var globs = files.map(function(file){  

			return new Promise( function(resolve,reject){
				glob(file, function(err, files){
					files = files || [];
					//if(err) throw err;
					var isExcept = exceptFiles.indexOf(file) >= 0;
					var hasFile = files.length!==0;
					if( !!(hasFile ^ isExcept) ) resolve(files[0]);
					else reject(file);
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
		var client = net.connect({host:config.viewerHost,port: 8001}, function() {
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
		args.unshift("-j");

		metadata.zipFilename = zipFilename;
		
		var process = childProcess.exec('zip '+args.join(' '),options,zipComplete.bind(null,metadata));


	}

	var setBasePath = function(dir){
		basePath = dir;
		logFilePath = path.join(basePath, config.log);
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
				console.error(error.toString().red);
				//process.exit(1);
				onComplete();
			});

		});
	}

	var uploadComplete = function(metadata,url){

		metadata.url = url + "?preload=1";
		//distpatch upload complete event
		eventEmitter.emit('uploadComplete',metadata);

		cancelProcessDir();

		console.log("url created: {0}".format(url));
	}

	var onComplete = function(metadata){
		eventEmitter.emit('onComplete',metadata);
		processingComplete(metadata.srcpath);

	}

	var loadLogFile = function(){
		try {
			var logEntries = fs.readFileSync(logFilePath);
		}
		catch(e){
			console.log('no existing log file found'.yellow);
			return;
		}
		logEntries = logEntries.toString().split('\n');
		
		processed = processed.concat( logEntries.map(function(logEntry){ 
			return logEntry.split(',')[0].trim(); 
		}).filter(function(dirname){
			return dirname[0]!=='#' && dirname.length>1;
		}).map(function(dirname){
			return path.join(basePath,dirname);
		}));

		console.log("Existing processed directories".green);
		console.log(processed.join("\n").green);
	}

	var writeLogFile = function(metadata){
		metadata["dirname"] = path.basename( metadata["srcpath"] );
		metadata["description"] = encodeURIComponent( metadata["description"] );

		processed.push(metadata["srcpath"]);

		var fields = config.fields;

		var entries = fields.map(function(key){ 
			return metadata[key] || "missing";
		});

		if( logFilePath ) fs.stat(logFilePath,function(err,stats){

			if(stats && stats.isDirectory()){
				eventEmitter("fileFail",new Error("config.log file {0} was a directroy".format(config.log)));
				return;
			}

			var entry = entries.join(",")+"\r\n";
			/* If the file doesn't exist, add field header to begining of new file */
			if(err){
				entry = "#"+fields.join(",")+"\r\n"+entry;
			}
			fs.appendFile(logFilePath, entry);

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

		emailNotification = new EmailNotifications(config);

		eventEmitter.on('onComplete',function(metadata){
			console.log('attempting to send email');
			if( metadata['email'] ) emailNotification.sendEmail(
				metadata['email'],
				metadata
			);
			else conso0le.log("no email provided".red);
		});
	}

	exports.enablePrint = function(){
		eventEmitter.on('onComplete',function(metadata){

		});
	}

	exports.on = function(event,callback){
		eventEmitter.on(event,callback);
	}

	var resolveDirectory = function(dir){

		var resolvedDir = path.normalize(dir);

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
			eventEmitter.emit("fileFail","path {0} given was not a directory".format(dir));						
		}

		if(resolvedDir.charAt(resolvedDir.length-1)=="/"){
			resolvedDir = resolvedDir.slice(0,-1);
		}

		return resolvedDir;

	}

	return exports;
};

