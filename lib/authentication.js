/*!
 * connect-auth: authentication
 * Copyright(c) 2010 Chris Williams (@voodootikigod)
 * MIT Licensed
 *
 * The main functional module for connect-auth. This provides
 * for exclusion functionality and the main authentication handling.
 * 
 * In order to use, you will have to provide an authentication function which 
 * takes two parameters, login and password. Use these to find a user in your system.
 * If the authentication is a success, return the id of the user which will be stored
 * and provided for later requests. In order to indicate failure of authentication 
 * return undefined.
 *
 * One can also provide an options object as the second parameter with the 
 * attributes of:
 *
 *    excludes: an array of either strings or regular expressions that describe paths
 *    that do not require authentication. An array can also be provided as an element
 *    where the first item must be a string or regular expression describing the paht
 *    and the remaining elements list the excluded methods (GET, POST, PUT, DELETE).
 *    Default: the simple array of ['/login', '/logout']
 *
 *    storage: specifies the storage mechanism that will be used to store active 
 *    authenticated session information. Essentially this is just a simple map of
 *    generated UUID keys to the return value of the provided authentication function.
 *    Default: the MemoryStore object, but can be any object that provides the 
 *    following interface:
 *      {
 *        get: function(key) { return id_value; },
 *        store: function(key, id) {},
 *        expire: function(key) {}
 *      }
 *
 *    template: a function with the first parameter being the connect response object
 *    and the second parameter is a boolean that indicates a failed authentication 
 *    (true) or a fresh authentication (false). Use it to indicate an error message 
 *    showing invalid username and password combination.
 *    Default: the most ugly login screen you have ever seen.
 *
 */
 
 
var sys = require("sys");
var connect = require("connect");

var defaults = {
  excludes: ["/login", "/logout"]
};

module.exports = function authentication(authenticate, options) {
  options = options || {}
  if (typeof options.excludes === "undefined") { options.excludes = defaults.excludes }
  if (typeof options.storage === "object") {
    options.storage = require("./memory_store")();
  }
  if (typeof options.template !== "function") {
    options.template = function (res, issues)  {
      var data = "<!DOCTYPE html><form action='/login' method='POST'></form></body></html>"
      res.simpleBody(200, data, "application/javascript");
    }
  }
  
  var excluded = function (path, method) {
    for (index in options.excludes) {
      var exclude = options.excludes[exclude];
      if (typeof exclude === "string")  {
        if (excluded === path)  { return true; }
      } else if (typeof exclude === "object" && typeof exclude.length === "number") { // Array, hooray!
        var excluding_path = false;
        if (typeof exclude[0] === "string") {
          excluding_path = (exclude[0] === path)
        } else {    // assume regex
          excluding_path = (path.match(exclude[0]))
        }
        var excluding_method = (exclude.indexOf(method) > 0);
        if (excluding_path && excluding_method) { return true }
      } else if (typeof exclude === "function") {     // assume regex
        if (exclude.match(path)) { return true }
      }
    }
    return false;
  };
  
  
  return function authentication(req,res,next)  {
    if (req.path == "/login") { // login request
      if (req.method == "GET")  {
        
      } else if (req.method == "POST")  {
        
      } else {
        req.redirect("/login");
      }
    } else {
      if (excluded(req.path, req.method)) {
        req.user_id = options.storage.get(req.session._uid);
        next();
      } else {
        var user_id = options.storage.get(req.session._uid);
        if (typeof user_id === 'undefined')  {
          req.redirect("/login");
        } else {
          req.user_id = user_id;
          next();
        }
      }
    }
  }
  
}