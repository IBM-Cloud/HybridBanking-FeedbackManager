module.exports.cleanUserName = function(str) {
	console.log("Cleaning " + str);
	var res = str.replace("’s iPhone", "");
	console.log("Result " + res);
	return res;
}