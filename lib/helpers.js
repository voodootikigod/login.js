var rbytes = require("rbytes");
module.exports.yesterday = (function () { var now = new Date(); now.setTime(now.getTime()-86400000); return now; });
module.exports.session_timeout = (function () { var now = new Date(); now.setTime(now.getTime()-(86400000 * 14)); return now; });
module.exports.persistence_token = (function () { return rbytes.randomBytes(128).toHex().slice(0,64); });
module.exports.tempkey = (function () {return rbytes.randomBytes(24).toHex()});