var bcrypt = require("bcrypt");
var helpers = require("./helpers");

function h (string) {
  return string.replace(/&/g, "&amp;").replace(/\\/g, "\\\\").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = (function (app, postgresql, postmark, options) { 
  options = (options || {});
  options["app_name"] = options["app_name"] || "Development App";
  options["base_url"] = options["base_url"] || "http://127.0.0.1:3000";
  options["from"] = options["from"]||"test@example.com";
  options["email_key"] = options["email_key"] || "email";

  var actions = {
    authenticate: function (req, res) {
      req.session.failed = false;
      req.session.email = null;
      res.sendfile(__dirname+"/static/login.html"); 
    },
    login_js: function (req, res) {
      var str= "$(function () {";
      if (req.session.failed) {
        str += "$('h2').after('<div class=\"alert-message error\"><p>The username or password you entered is incorrect.</p></div>');"
      }
      if (req.session.email) {
        str += "$('#email').val(\""+h(req.session.email)+"\");"
      }
      str +=" });"
      res.send(str);
    },
    authentication: function (req, res) {
      
      var failed = function () {
        req.session.failed = true;
        req.session.email = req.body.email;
        res.sendfile(__dirname+"/static/login.html");
      }
      if (req.body.email && req.body.password) {
        postgresql.query("select * from users where LOWER("+options["email_key"]+") = $1 and disabled_at is null and deleted_at is null", [req.body.email.toLowerCase()], function (err, result) {
          if (result.rows.length == 1) {
            var user = result.rows[0];
            if (bcrypt.compare_sync(req.body.password, user.crypted_password)) {
              var pt = helpers.persistence_token();
              var now = new Date();
              var ipAddr = req.connection.remoteAddress;
              postgresql.query("update users set persistence_token = $1, current_login_at = $2, last_login_at = $3, last_login_ip = $4, current_login_ip = $5, login_count = $6 where id = $7;", [pt, now, user.current_login_at, user.current_login_ip, ipAddr,  (user.login_count || 0) + 1, user.id ], function (err, update_res) {
                if (!err) {
                  req.session.pt = pt;
                  if (req.session.previous_url) {
                    var purl = req.session.previous_url;
                    delete req.session.previous_url;
                    res.redirect(purl);
                  } else {
                    res.redirect("/");
                  }
                } else { 
                  failed();
                }
              });
            } else {
              failed();
            }
          } else { 
            failed();
          }
        })
      } else {
        failed();
      }
    },
    forgot_password: function (req, res) {
      req.session.failed = false;
      res.sendfile(__dirname+"/static/forgot.html");
    },
    forgot_js: function (req, res) {
      var str= "$(function () {";
      if (req.session.failed) {
        str += "$('h2').after('<div class=\"notice\">Could not find account with that email address.<br>Please try again.</div>');"
      }
      if (req.session.email) {
        str += "$('#email').val(\""+h(req.session.email)+"\");"
      }
      str +=" });"
      res.send(str);
    },
    send_password: function (req, res) {
      req.session.failed = false;
      req.session.email = null;
      if (req.body.email) {
        req.session.email = req.body.email;
        postgresql.query("select * from users where "+options["email_key"]+" = $1", [req.body.email], function (err, result) {
          if (result.rows.length == 1) {
            var user = result.rows[0];
            var tempkey = helpers.tempkey();
            postgresql.query("update users set perishable_token = $1, last_request_at = NOW() where id = $2;", [tempkey, user.id], function (err, update_res) {
              postmark.send({
                "From": options.from,
                "To": req.body.email,
                "Subject": options.app_name + " Password Reset Request",
                "TextBody": "Hey, we heard you lost your "+options.app_name+" password.  Say it ain't so!\n\nUse the following link within the next 24 hours to reset your password:\n\n" + options.base_url + "/login/reset/"+tempkey+"\n\nThanks,\nThe "+options.app_name+" Team"
              });
              res.sendfile(__dirname+"/static/sent.html");
            })
          } else {
            req.session.failed = true;
            res.redirect("/forgot_password");
          }
        });
      } else {
        req.session.failed = true;
        res.redirect("/forgot_password");
      }
    },
    sent_js: function (req, res) {
      var str= "$(function () {";
      if (req.session.email) {
        str += "$('#email').text(\""+h(req.session.email)+"\");"
      }
      str +=" });"
      res.send(str);
    },

    reset_password: function (req, res) {
      req.session.psk = null;
      if (req.params.psk) {
        postgresql.query("select * from users where perishable_token = $1 and last_request_at >= $2", [req.params.psk, helpers.yesterday()], function (err, result) {
          if (result.rows && result.rows.length ==1) {
            req.session.email = result.rows[0][options["email_key"]];
            req.session.psk = req.params.psk;
            res.sendfile(__dirname+"/static/reset.html");
          } else {
            res.redirect("/forgot_password");
          }
        });
      } else { 
        res.redirect("/forgot_password");
      }
    },
    reset_js: function (req, res) {
      var str= "$(function () {";
      str += "$('#email').val(\""+h(req.session.email)+"\");"
      str += "$('#psk').val(\""+h(req.session.psk)+"\");"
      str +=" });"
      res.send(str);
    },

    update_password: function (req, res) { 
      if (req.body.psk) {
        if (req.body.password && req.body.password.length > 6 && req.body.password.length < 200 && req.body.password == req.body.password_confirmation) {
          var salt = bcrypt.gen_salt_sync(10);
          var hash = bcrypt.encrypt_sync(req.body.password, salt);
          var pt = helpers.persistence_token()
          postgresql.query("update users set crypted_password = $1, persistence_token = $4 where perishable_token = $2 and last_request_at >= $3;", [hash, req.body.psk, helpers.yesterday(), pt], function (err, update_res) {
            req.session.pt = pt;
            res.sendfile(__dirname+"/static/updated.html");
          });
        } else {
          res.redirect("/login/reset/"+h(req.body.psk))
        }
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


  app.get("/login/buttons.png", function (req, res) { res.sendfile(__dirname+"/static/buttons.png"); });
  app.get("/login/login.css", function (req,res) { res.sendfile(__dirname + "/static/login.css"); });
  app.get("/login/login.js", actions.login_js);
  app.get("/login/forgot.js", actions.forgot_js);
  app.get("/login/reset.js", actions.reset_js);
  app.get("/login/sent.js", actions.sent_js);

  // Basic account maintenance
  app.get("/authenticate", actions.authenticate);
  app.post("/authenticate", actions.authentication); 
  app.get("/forgot_password", actions.forgot_password);
  app.post("/forgot_password", actions.send_password);
  app.get("/login/reset/:psk", actions.reset_password);
  app.post("/reset_password", actions.update_password);
  app.get("/logout", actions.logout);
  

  var fubt = (function (pt, cb) {
    postgresql.query("select * from users where persistence_token = $1 and current_login_at >= $2", [pt, helpers.session_timeout()], function (err, result) {
      if (result.rows && result.rows[0])
        cb(result.rows[0]);
      else
        cb(null);
    })
  });

  return {
    
    find_user_by_token: fubt,
    load_user: function (req, res, next) {
      if (req.session.pt) {
        fubt(req.session.pt, function (user) {
          if (user) { req.user = user }
          next();
        });
      } else {
        next();
      }
    }, 
    require_user: function (req, res, next) {
      req.session.previous_url = req.url;
      if (req.session.pt) {
        fubt(req.session.pt, function (user) {
          if (user) { 
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
      if (extra_fields) {
        if (!(/$,/.test(extra_fields))) {
          extra_fields = ", "+extra_fields;
        }
      } else {   
        extra_fields = "";
      }
      postgresql.query('CREATE TABLE IF NOT EXISTS "users" (	"id" int4 NOT NULL DEFAULT nextval(\'users_id_seq\'::regclass), "email" varchar(255) NOT NULL DEFAULT NULL,	"crypted_password" varchar(255) NOT NULL DEFAULT NULL, "persistence_token" varchar(255) NOT NULL DEFAULT NULL,	"perishable_token" varchar(255) NOT NULL DEFAULT NULL,	"login_count" int4 NOT NULL DEFAULT 0,	"last_request_at" timestamp(6) NULL DEFAULT NULL,	"current_login_at" timestamp(6) NULL DEFAULT NULL,	"last_login_at" timestamp(6) NULL DEFAULT NULL,	"current_login_ip" varchar(255) DEFAULT NULL,	"last_login_ip" varchar(255) DEFAULT NULL'+extra_fields+') WITH (OIDS=FALSE);', function (err, result) {
        var salt = bcrypt.gen_salt_sync(10);
        var hash = bcrypt.encrypt_sync(password, salt);
        postgresql.query("insert into users (email, crypted_password) VALUES ($1, $2)", [email, hash], function (err1, res2) {
          console.log("Bootstrapped user authentication system");
        });
      });
    } 
  };
});