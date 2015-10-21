module.exports = {
	privateConfig : './.config.js',
	tags : "sometag anothertag",
	log : "record.csv",
	metadata : "metadata.json",
	webroot: 'www-app',
	port: 8080,
	uploadToSketchfab : true,
	formTemplate : "www-app/form-template.html",
	emailNotificationTemplate : "www-app/email-template.html",
	emailNotificationSubject : "subject heading : {scan-name}",
	emailNotificationAttachments : [
		{filename:'form_logo_realD.png', path: 'www-app/img/form_logo_realD.png', cid: '998110'},
		{filename:'form_logo_vue.png', path: 'www-app/img/form_logo_vue.png', cid: '93a191'},
	],
	fields : [
			"dirname",
			"name",
			"scan-name",
			"description",
			"email",
			"phone",
			"twitter",
			"url"
	]
};