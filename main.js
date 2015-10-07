#!/usr/bin/env node

var util = require('util');
var fs = require('fs');

var colors = require('colors');
var args = require('yargs').argv;
require('stringformat').extendString();

var config = require('./config');
var ModelMaker = require('./ModelMaker');

var exitWithError = function(msg,status){
	if( typeof(status)==='undefined' ) status = 1;
	process.stderr.write(msg+"\n");
	process.exit(status);
}

if( fs.existsSync(config.privateConfig) ){
	var privateConfig = require(config.privateConfig);
	config = util._extend(config,privateConfig);
}
else {
	exitWithError("private config file {0} not found".format(config.privateConfig));
}

if( args._.length == 0 && args.w ){
	console.log('watch directory');

	var modelMaker = ModelMaker(config);

	modelMaker.watch(args.w);
}
else if( args._.length == 1 ){
	var modelMaker = ModelMaker(config);
	modelMaker.on("fileFail",function(e){
		exitWithError("File processing failure \n{0}".format(e.toString()));
	});
	modelMaker.process(args._[0]);
}
else {
	exitWithError([
		"missing arguments",
		"usage: main.js {process_dir}  - uploads models located in provided directory ",
		"usage: main.js -w {watch_dir}  - watch the following directory and upload model files added there"
	].join('\n').red);
}

