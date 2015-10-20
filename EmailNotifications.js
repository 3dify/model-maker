var nodemailer = require('nodemailer');

module.exports = function(config){

	var exports = {};

	var transporter = nodemailer.createTransport({
    service: 'Gmail',
	    auth: {
	        user: config.email.user,
	        pass: config.email.password
	    }
	});

	exports.sendEmail = function(address,subject,template){
		var options = {
			from: config.email.from,
			to: address,
			subject: subject,
			text: template
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