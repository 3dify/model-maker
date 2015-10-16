module.exports = {
	privateConfig : './.config.js',
	tags : "sometag anothertag",
	log : "record.csv",
	metadata : "metadata.json",
	webroot: 'www-app',
	port: 8080,
	uploadToSketchfab : true,
	formTemplate : "www-app/form-template.html",
	fields : [
			"dirname",
			"name",
			"scan name",
			"description",
			"email",
			"phone",
			"twitter",
			"url"
	]
};