# login.js


*BIG NOTE* Version 0.8.0 and above are being migrated to not use any template engine as a dependency. It started with 0.8.0 with the migration occurring for the PostgreSQL support. This is allow better operation regardless of your choice of engine. Right now only PostgreSQL has this improvement. I have moved redis and couchdb support into the Attic until I can convert them over as well. IF YOU ARE USING COUCHDB OR REDIS SUPPORT WITH THIS MODULE DO NOT UPGRADE TO 0.8.x UNTIL SUPPORT IS ADDED.

login.js is designed to be a drop-in, minimal configuration express.js login and forgot password module. It doesn't provide twitter accounts OAuth, openid, or Facebook connect authentication, it just makes standard user authentication easy peasy. The original design <strike>most likely</strike> did suck horribly because it was made by Chris Williams ([voodootikigod][http://voodootikigod.com]) and was driven by a need for such a thing (and a good couple pints of beer). It has since been refactor for your pleasure. 

## Features

  * Brain-dead simple authentication implementation. Instant user authentication, zero thought.


## Getting Started

At some point in the life of a web application you will want to know who is who, for whatever (devious) reason. login.js works with either Redis or PostgreSQL (needs to be configured) and provides super strong encryption - read-in BCrypt - unlike every other authentication system out there. For now user account creation is left as an exercise for the reader (eventually will be brought into this section as well, but not at this time).

First off we need to initialize our system, we can use either the PostgreSQL (npm install pg) or Redis (npm install redis) backend system

    var express       =   require("express"), 
        connect     =   require("connect"), 
        postmark    =   require("postmark")(POSTMARK_API_KEY), 
        postgres    =   require("pg");
    
    var login = require("login").postgresql;
    var app = express.createServer();
    
Then we connect our database and pass in our configuration data:

    postgres.connect(config.postgresql, function (err, db) {
      var auth = login(app, db, postmark, { 
        app_name: "Magical Application", 
        base_url: "http://unicorn.example.com", 
        from: "donotreply@example.com"
      });.
    });

For Redis users, the following code is the same example:

    var express       =   require("express"), 
        connect     =   require("connect"), 
        postmark    =   require("postmark")(POSTMARK_API_KEY), 
        redis    =   require("redis").createClient();

    var login = require("login").redis;
    var app = express.createServer();

Then we connect our database and pass in our configuration data:

    var auth = login(app, redis, postmark, { 
      app_name: "Magical Application", 
      base_url: "http://unicorn.example.com", 
      from: "donotreply@example.com"
    });

This will autobind the various routes for authentication into your system as well as forgot password handling. Basically everything you need for a usable, secure application (it is even mildly pretty too!) It also provides you with helper functions of load\_user and require\_user which can be used for locking down parts of your application and instantiating the user object in others. 

Use like this:

    app.("/secure/index", auth.require\_user, function (req, res) { res.send("#winning"); });

to block people from accessing the secure part of your app.

Or use like this:

    app.("/public/index", auth.load\_user, function (req, res) { res.send("everybody gets a car!"); });

to have the user object of the logged in user available on the request object (req.user) if available, else it will be undefined. 

Bitching.

## Database Requirements

Redis requires nothing other than being set up. Users are keyed off their logins and are assumed to hashes - rest can be handled by the system.

PostgreSQL requires a bit of schema love that I will import later (you can look at the source code for now to figure it out -- or ask me).


## License 

(The MIT License)

Copyright (c) 2010, 2011 Chris Williams

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.