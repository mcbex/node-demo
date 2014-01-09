var http = require('http');

function helloWorld(request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/html'
    });

    response.write('Hello World!');
    response.end();
};

function start() {
    http.createServer(helloWorld).listen(9999);
};

exports.start = start;

