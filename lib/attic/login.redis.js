var bcrypt = require("bcrypt");
var helpers = require("./helpers");

module.exports = (function (app, redis, postmark, options) { 
  options = (options || {});
  options["app_name"] = options["app_name"] || "Development App";
  options["base_url"] = options["base_url"] || "http://127.0.0.1:3000";
  options["from"] = options["from"]||"test@example.com";
  
  var actions = {
    authenticate: function (req, res) {
      res.render(__dirname+"/views/authenticate", {layout: __dirname+"/views/layout"})
    },
    authentication: function (req, res) {
      if (req.body.email && req.body.password) {
        redis.hgetall(req.body.email, function (err, user) {
          if (!err && user.email == req.body.email) {
            if (bcrypt.compare_sync(req.body.password, user.encrypted_password)) {
              var pt = helpers.persistence_token();
              var now = +new Date();
              var ipAddr = req.connection.remoteAddress;
              redis.hmset(req.body.email, "persistence_token", pt, "current_login_at", ""+now, "last_login_at", user.current_login_at, "last_login_ip", user.current_login_ip, "current_login_ip", ipAddr, function (err) {
                req.session.pt = req.body.email+":"+pt;
                res.redirect("/");
              });
            } else {
              res.render(__dirname+"/views/authenticate", {layout: __dirname+"/views/layout", failed: true, email: req.body.email})
            }
          } else { 
            res.render(__dirname+"/views/authenticate", {layout: __dirname+"/views/layout", failed: true, email: req.body.email})
          }
        })
      } else {
        res.render(__dirname+"/views/authenticate", {layout: __dirname+"/views/layout", failed: true, email: req.body.email})
      }
    },
    forgot_password: function (req, res) {
      res.render(__dirname+"/views/forgot_password", {layout: __dirname+"/views/layout"});
    },
    send_password: function (req, res) {
      if (req.body.email) {
        redis.hgetall(req.body.email, function (err, user) {
          if (user) {
            var tempkey = helpers.tempkey();
            redis.hmset(req.body.email, "perishable_token", tempkey, "last_request_at", +(new Date()), function (err, update_res) {
              postmark.send({
                "From": options.from,
                "To": req.body.email,
                "Subject": options.app_name + " Password Reset Request",
                "TextBody": "Hey, we heard you lost your "+options.app_name+" password.  Say it ain't so!\n\nUse the following link within the next 24 hours to reset your password:\n\n" + options.base_url + "/login/"+req.body.email+"/"+tempkey+"\n\nThanks,\nThe OurParents Team"
              });
              res.render(__dirname+"/views/reset_password", {layout: __dirname+"/views/layout", email: req.body.email})
            })
          } else {
            res.render(__dirname+"/views/forgot_password", {layout: __dirname+"/views/layout", error: true})
          }
        });
      } else {
        res.render(__dirname+"/views/forgot_password", {layout: __dirname+"/views/layout", error: true})
      }
    },


    reset_password: function (req, res) {
      if (req.params.email && req.params.psk) {
        
        redis.hgetall(req.params.email, function (err, user) {
          if (user.last_request_at < (+helpers.yesterday()) || req.params.psk != user.perishable_token) {
            res.redirect("/forgot_password");
          } else {
            res.render(__dirname+"/views/update_password", {layout: __dirname+"/views/layout", psk: req.params.psk, email: req.params.email});
          }
        });
      } else { 
        res.redirect("/forgot_password");
      }
    },
    update_password: function (req, res) { 
      if (req.body.psk && req.body.email) {
        hgetall(req.body.email, function (err, user) {
          if (user.last_request_at < (+helpers.yesterday()) || req.body.psk != user.perishable_token) {
            res.redirect("/forgot_password");
          } else if (req.body.password && req.body.password.length > 6 && req.body.password.length < 200 && req.body.password == req.body.password_confirmation) {
            var salt = bcrypt.gen_salt_sync(10);
            var hash = bcrypt.encrypt_sync(req.body.password, salt);
            var pt = helpers.persistence_token()
            redis.hmset(req.body.email, "encrypted_password", hash,"persistence_token", pt, "current_login_at", now, "last_login_at", user.current_login_at, "last_login_ip", user.current_login_ip, "current_login_ip", ipAddr, function (err) {
              req.session.pt = req.body.email+":"+pt;
              res.render(__dirname+"/views/updated_password", {layout: __dirname+"/views/layout"});
            });
          } else {
            res.redirect("/login/"+req.body.email+"/"+req.body.psk)
            res.redirect("/forgot_password");
          }
        });
      } else {
        res.redirect("/forgot_password");
      }
    }, 
    logout: function (req, res) {
      req.session.pt = null;
      delete req.session.pt;
      res.redirect("/");
    }
  };




  // Basic account maintenance
  app.get("/authenticate", actions.authenticate);
  app.post("/authenticate", actions.authentication); 
  app.get("/forgot_password", actions.forgot_password);
  app.post("/forgot_password", actions.send_password);
  app.get("/login/:email/:psk", actions.reset_password);
  app.post("/reset_password", actions.update_password);
  app.get("/logout", actions.logout);
  app.get("/login/login.css", function (req,res) { res.sendfile(__dirname + "/static/login.css"); });



  var fubt = (function (pt, cb) {
    var parts = pt.split(":");
    redis.hgetall(parts[0], function (err, result) {
      if (result.helpers.persistence_token == parts[1] && result.current_login_at >= (+helpers.session_timeout())) {
        cb(result);
      } else {
        cb(null);
      }
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
      var salt = bcrypt.gen_salt_sync(10);
      var hash = bcrypt.encrypt_sync(password, salt);
      redis.hmset(req.body.email, "encrypted_password", hash, "email", email, function (err) {
        console.log("Bootstrapped user authentication system");
      });
    }
  };
});