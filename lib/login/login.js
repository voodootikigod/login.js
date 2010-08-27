/*!
 * connect authentication: login.js
 * Copyright(c) 2010 Chris Williams (@voodootikigod)
 * MIT Licensed
 *
 * The main functional module for connect-auth. This provides
 * for exclusion functionality and the main login handling.
 * 
 * In order to use, you will have to provide an login function which 
 * takes two parameters, login and password. Use these to find a user in your system.
 * If the login is a success, return the id of the user which will be stored
 * and provided for later requests. In order to indicate failure of login 
 * return undefined.
 *
 * One can also provide an options object as the second parameter with the 
 * attributes of:
 *
 *    excludes: an array of either strings or regular expressions that describe paths
 *    that do not require login. An array can also be provided as an element
 *    where the first item must be a string or regular expression describing the path
 *    and the remaining elements list the excluded methods (GET, POST, PUT, DELETE).
 *    Default: the simple array of ['/login', '/logout']
 *
 *    storage: specifies the storage mechanism that will be used to store active 
 *    authenticated session information. Essentially this is just a simple map of
 *    generated UUID keys to the return value of the provided login function.
 *    Default: the MemoryStore object, but can be any object that provides the 
 *    following interface:
 *      {
 *        get: function(key) { return id_value; },
 *        set: function(key, id) {},
 *        del: function(key) {}
 *      }
 *
 *    template: a function with the first parameter being the connect response object
 *    and the second parameter is a boolean that indicates a failed login 
 *    (true) or a fresh login (false). Use it to indicate an error message 
 *    showing invalid username and password combination.
 *    Default: the most ugly login screen you have ever seen.
 *
 */


var sys = require("sys");
var connect = require("connect");

var defaults = {
    excludes: ["/login", "/logout"]
};


var inspector = function (obj) {
    for (i in obj) 
        sys.puts(""+i+": "+obj[i]);
};

module.exports = function login(authenticate, options) {
    options = options || {}
    if (typeof options.excludes === "undefined") { options.excludes = defaults.excludes }
    if (typeof options.storage === "object") {
        options.storage = require("./memory_store")();
    }
    if (typeof options.template !== "function") {
        options.template = function (response, login, message)  {
            if (typeof login == 'undefined')
                login = "";
            if (typeof message == 'undefined') 
                message = "";
            else
                message = "<div id='error'>"+message+"</div>";
            var screen = "<!DOCTYPE html>\n<html><head><title>Login Screen</title></head><body><h1>Login</h1>"+message+"<form method='POST' action='/login'><fieldset><label for='login'>Login</label><input type='text' id='login' name='login' value='"+login+"' /><label for='password'>Password</label><input id='password' name='password' type='password' /><input type='submit' value='Login'/></form></body></html>";
            response.writeHead(200, {
                "Content-Type": "text/html",
                "Content-Length": screen.length
            });
            response.end(screen);
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
    
    
    return function login(req,res,next)  {
        if (req.url == "/login") { // login request
            if (req.method == "GET")  {
                options.template(res);
            } else if (req.method == "POST")  {
				// Hack to ensure that req.param actually works as expected despite req.params not being defined.
				if (typeof req.params == 'undefined') 
					req.params = {};
                var user_id = authenticate(req.param("login"), req.param("password"))
                if (user_id) {
                    var uid = (""+(new Date()).valueOf()+""+req.param("login"));

                    options.storage.set(uid, user_id);
                    res.redirect("/");
                } else {
                    options.template(res, req.params("login"), "Could not authenticate you, please try again.");
                }
            } else {
                res.redirect("/login");
            }
        } else {
            if (excluded(req.path, req.method)) {
                if (req.session)
                    req.user_id = options.storage.get(req.session._uid);
                next();
            } else {
                var user_id = undefined;
                if (req.session)
                    user_id = options.storage.get(req.session._uid);
                if (typeof user_id === 'undefined')  {
                    res.redirect("/login");
                } else {
                    req.user_id = user_id;
                    next();
                }
            }
        }
    }
    
}