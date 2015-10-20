
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
			from: config.email.user,
			to: address,
			subject: subject,
			text: template
		}

		transporter.sendMail(options,function(error,info){
			if(error){
				console.error(error);
			}
			console.log(info.response);
		});
	}


	return exports;
}