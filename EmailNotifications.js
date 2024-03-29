var fs = require('fs');

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;

module.exports = function(config){

	var exports = {};
	var emailTemplate = "";

	var transporter = nodemailer.createTransport({
    service: 'Gmail',
	    auth: {
	        user: config.email.user,
	        pass: config.email.password
	    }
	});

	transporter.use('compile', htmlToText());

	[
		'emailNotificationTemplate',
		'emailNotificationAttachments',
		'emailNotificationSubject'
	].forEach(function(option){
		if( !config.hasOwnProperty(option) ){
			throw new Error("Missing config option: {0}".format(option));
		}
	});

	fs.readFile(config.emailNotificationTemplate,'utf8',function(err,contents){
		if( err ) throw err;
		emailTemplate = contents.toString();
	});

	exports.sendEmail = function(address,data){
		var options = {
			from: config.email.from,
			to: address,
			subject: config.emailNotificationSubject.format(data),
			html: emailTemplate.format(data),
			attachments: config.emailNotificationAttachments
		}

		transporter.sendMail(options,function(error,info){
			if(error){
				console.error(error);
			}
			if( info ){
				console.log(info.response);				
			}
		});
	}


	return exports;
}