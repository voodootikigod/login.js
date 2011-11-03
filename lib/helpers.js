
module.exports.yesterday = (function () { var now = new Date(); now.setTime(now.getTime()-86400000); return now; });
module.exports.session_timeout = (function () { var now = new Date(); now.setTime(now.getTime()-(86400000 * 14)); return now; });
module.exports.persistence_token = (function () { 
	return randkey(64);
});
module.exports.tempkey = (function () {
	return randkey(24);
});
		
function randkey(a,b){b=b||16;return Array(a||32).join(0).replace(/0/g,function(){return(0|Math.random()*b).toString(b)})}
