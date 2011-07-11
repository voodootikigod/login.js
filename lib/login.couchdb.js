var bcrypt  = require("bcrypt");
var http    = require("http");
var url     = require("url");
var helpers = require("./helpers");


// Pass in the base couchdb url (assumes database exists)
module.exports = (function (app, couchdb_url, postmark, options) { 
  options = (options || {});
  options["app_name"] = options["app_name"] || "Development App";
  options["base_url"] = options["base_url"] || "http://127.0.0.1:3000";
  options["from"] = options["from"]||"test@example.com";
  
  
  //  CouchDB parsing...
  if (!(/\/$/.test(couchdb_url)))  {
    couchdb_url += "/";
  }
  var parsed_url = url.parse(couchdb_url);
  var port = parsed_url.port || 80;
  if (parsed_url.protocol == "https:" && port == 80) { port = 443; }
  var http_options = { 
    port: parsed_url.port,
    host: parsed_url.hostname,
    headers: []
  };
  http_options.headers['Content-Type'] = 'application/json';
  if (parsed_url.auth) {
    http_options.headers["Authorization"] = 'Basic ' + new Buffer(parsed_url.auth).toString('base64');
  }
  var base_path = parsed_url.pathname;
  
  function CouchDBRequest(path, method) {
    this.path = base_path+path;
    this.method = (typeof method == 'undefined' ? 'GET' : method);
  }

  CouchDBRequest.prototype = http_options;
  
  function saveUser(user, onComplete, onError) {
    var update = http.request(new CouchDBRequest(user._id, 'PUT'), function (post_response) {
      var data = "";
      post_response.on("data", function (d) { data += d; });
      if (post_response.statusCode == 201) {
        onComplete();
      } else {
        post_response.on("end", function () {
          onError(JSON.parse(data));
        })
      }
    });
    update.write(JSON.stringify(user));
    update.end();
  }
  
  
  function getUser(email, onComplete) {
    http.get(new CouchDBRequest(email), function (response) {
      if (response.statusCode == 200) {
        var data = "";
        response.on("data", function (d) { data += d; });
        response.on("end", function () {
          var user = JSON.parse(data);
          onComplete(user);
        });
      } else { 
        onComplete(null);
      }
    });

  }

  
  
  var actions = {
    authenticate: function (req, res) {
      res.render(__dirname+"/views/authenticate", {layout: __dirname+"/views/layout"})
    },
    authentication: function (req, res) {
      var failed_authentication = function () {
        res.render(__dirname+"/views/authenticate", {layout: __dirname+"/views/layout", failed: true, email: req.body.email});
      };
      if (req.body.email && req.body.password) {
        getUser(req.body.email, function (user) {
          if (user && bcrypt.compare_sync(req.body.password, user.encrypted_password)) {
            var pt = helpers.persistence_token();
            
            user.persistence_token = pt;
            user.last_login_at = user.current_login_at;
            user.last_login_ip = user.current_login_ip;
            
            user.current_login_at = +(new Date());
            user.current_login_ip = req.connection.remoteAddress;
            saveUser(user, function () { 
              req.session.pt = pt;
              res.redirect("/");
            }, failed_authentication);
                
          } else {
            failed_authentication();
          }
        });
      } else { 
        res.render(__dirname+"/views/authenticate", {layout: __dirname+"/views/layout", failed: true, email: req.body.email})
      }
    },
    forgot_password: function (req, res) {
      res.render(__dirname+"/views/forgot_password", {layout: __dirname+"/views/layout"});
    },
    send_password: function (req, res) {
      var failed_reset = function () {
        res.render(__dirname+"/views/forgot_password", {layout: __dirname+"/views/layout", error: true});
      };
      if (req.body.email) {
        getUser(req.body.email, function (user) {
          var tempkey = helpers.tempkey();
          user.perishable_token = tempkey;
          user.perishable_token_at = +(new Date());
          saveUser(user, function () {
            postmark.send({
              "From": options.from,
              "To": req.body.email,
              "Subject": options.app_name + " Password Reset Request",
              "TextBody": "Hey, we heard you lost your "+options.app_name+" password.  Say it ain't so!\n\nUse the following link within the next 24 hours to reset your password:\n\n" + options.base_url + "/login/"+req.body.email+"/"+tempkey+"\n\nThanks,\nThe OurParents Team"
            });
            res.render(__dirname+"/views/reset_password", {layout: __dirname+"/views/layout", email: req.body.email})
          }, failed_reset);
        });
      } else {
        failed_reset();
      }
    },


    reset_password: function (req, res) {
      var redir = function () {
        res.redirect("/forgot_password");
      };
      if (req.params.email && req.params.psk) {
        getUser(req.params.email, function (user) {
          if (user) {
            if (user.last_request_at < (+helpers.yesterday()) || req.params.psk != user.perishable_token) {
              redir();
            } else {
              res.render(__dirname+"/views/update_password", {layout: __dirname+"/views/layout", psk: req.params.psk, email: req.params.email});
            }
          } else { 
            redir() 
          }
        });
      } else { 
        redir();
      }
    },
    update_password: function (req, res) { 
      var redir = function () {
        res.redirect("/forgot_password");
      };
      if (req.body.psk && req.body.email) {
        getUser(req.body.email, function (user) {
          if (user) {
            if (user.last_request_at < (+helpers.yesterday()) || req.body.psk != user.perishable_token) {
              redir();
            } else if (req.body.password && req.body.password.length > 6 && req.body.password.length < 200 && req.body.password == req.body.password_confirmation) {
              var salt = bcrypt.gen_salt_sync(10);
              var hash = bcrypt.encrypt_sync(req.body.password, salt);
              var pt = helpers.persistence_token()
              
              user.encrypted_password = hash;
              user.persistence_token = pt;
              user.last_login_at = user.current_login_at;
              user.last_login_ip = user.current_login_ip;
              user.current_login_at = +(new Date());
              user.current_login_ip = req.connection.remoteAddress;
              saveUser(user, function () {
                req.session.pt = pt;
                res.render(__dirname+"/views/updated_password", {layout: __dirname+"/views/layout"});
              }, redir);
            } else {
              res.render(__dirname+"/views/update_password", {
                layout: __dirname+"/views/layout", 
                psk: req.params.psk, 
                email: req.params.email
              });
            }
          } else redir();
        });
      } else {
        redir();
      }
    }, 
    logout: function (req, res) {
      req.session.pt = null;
      delete req.session.pt;
      res.redirect("/");
    }
  };



  // Basic account maintenance
  app.get("/login/login.css", function (req,res) { res.sendfile(__dirname + "/static/login.css"); });
  app.get("/authenticate", actions.authenticate);
  app.post("/authenticate", actions.authentication); 
  app.get("/forgot_password", actions.forgot_password);
  app.post("/forgot_password", actions.send_password);
  app.get("/login/:email/:psk", actions.reset_password);
  app.post("/reset_password", actions.update_password);
  app.get("/logout", actions.logout);



  var fubt = (function (pt, cb) {
    http.get(new CouchDBRequest("_design/find_user/_view/persistence_token/?key=\""+pt+"\""), function (response) {
      data = "";
      response.on("data", function (d) { data += d; });
      response.on("end", function () {
        var user = JSON.parse(data)["rows"][0];
        if (user) { user = user.value; }
        if (user && user.current_login_at >= (+helpers.session_timeout())) {
          cb(user);
        } else {
          cb(null);
        }
      });
      
    });
  });  
  
  
  return {
    find_user_by_token: fubt,
    load_user: function (req, res, next) {
      if (req.session.pt) {
        fubt(req.session.pt, function (user) {
          if(user) { req.user = user }
          next();
        });
      } else {
        next();
      }
    }, 
    require_user: function (req, res, next) {
      if (req.session.pt) {
        fubt(req.session.pt, function (user) {
          if(user) { 
            req.user = user;
            next();
          } else {
            res.redirect("/authenticate");
          }
        });
      } else {
        res.redirect("/authenticate");
      }
    },
    bootstrap: function (email, password, extra_fields) {
      http.get(new CouchDBRequest("_design/find_user"), function (response) {
        if (response.statusCode == 404) {
          var pt_view = http.request(new CouchDBRequest("_design/find_user", "PUT"), function (response) {
            if (response.statusCode == 201) {
              console.log("[login.js] Bootstrapped authentication system.");
              var default_user = http.request(new CouchDBRequest(email, "PUT"), function (resp) {
                if (resp.statusCode == 201) 
                  console.log("[login.js] Bootstrapped default user - "+email);
              });
              var salt = bcrypt.gen_salt_sync(10);
              var hash = bcrypt.encrypt_sync(password, salt);
              var user = {
                "_id": email,
                email: email, 
                type: 'user', 
                encrypted_password: hash
              };

              if (extra_fields) {
                for (var field in extra_fields) {
                  if (extra_fields.hasOwnProperty(field))
                    user[field] = extra_fields[field];
                }
              }
              default_user.write(JSON.stringify(user));
              default_user.end();
            }
          });
          pt_view.write('{"_id":"_design/find_user","language":"javascript","views":{"persistence_token":{"map":"function(doc) { if (doc.type == \'user\') {   emit(doc.persistence_token, doc); } }"},"email":{"map":"function(doc) { if (doc.type == \'user\') {   emit(doc.email, doc); } }"}}}');
          pt_view.end();
          
          
        }
      });
    }
  };
});