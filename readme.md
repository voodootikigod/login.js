# login.js

login.js is designed to be a drop-in, minimal configuration [Connect middleware](http://github.com/senchalabs/connect) module that provides user authentication for web applications. It doesn't provide twitter accounts, openid, or facebook connect authentication, it just makes standard user authentication easy peasy. The original design most likely sucks horribly because it was made by Chris Williams ([voodootikigod][]) and was driven by a need for such a thing (and a good couple pints of beer).

login.js is released under similar licensing to Connect, a very liberal MIT license.

## Features

  * Brain-dead simple authentication implementation.
  * Ability to make it more complex ONLY if you want it to be.
  

## I AM SAM

At some point in the life of a web application you will want to know who is who, for whatever (devious) reason. login.js provides you with a very simple, in-memory authentication process, but that can be swapped out for other formats. Enough flapping, here is all you need to get it going:


    var Connect, login = require('connect'), require('login');

    var server = Connect.createServer(
      login(function (user, password) { return 1; }),
      function(req, res) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Hello World');
      }
    );
    var server = Connect.createServer();
    server.listen(3000);

Viola, that's it. Ok, maybe not anything special, but this gives us all the basis for what you need. the login function is the instantiation of our middleware which needs a function that returns some identifier for a user IF AND ONLY IF the user and password match an actual user. If it does not match a person, simply return undefined. That is all that is required of you to have a full login system. Note this also works, in similar fashion for express.js.

## Configuration

What that's not enough for you? We have configurations for you, provide these as an object for the second parameter to the login execution:

    excludes: an array of either strings or regular expressions that describe paths
    that do not require login. An array can also be provided as an element
    where the first item must be a string or regular expression describing the path
    and the remaining elements list the excluded methods (GET, POST, PUT, DELETE).
    Default: the simple array of ['/login', '/logout']

    template: a function with the first parameter being the connect response object
    and the second parameter is a boolean that indicates a failed login 
    (true) or a fresh login (false). Use it to indicate an error message 
    showing invalid username and password combination.
    Default: the most ugly login screen you have ever seen.

## License 

(The MIT License)

Copyright (c) 2010 Chris Williams

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