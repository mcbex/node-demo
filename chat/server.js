var server;

function createServer() {

    var http = require('http'),
        fs = require('fs'),
        url = require('url');

    server = http.createServer(function(request, response) {
        var route = url.parse(request.url).pathname;

        if (route == '/') {
            fs.readFile('./index.html', function(err, data) {
                if (err) {
                    response.writeHead(500);
                    response.write('Internal server error');
                    return response.end();
                }

                response.writeHead(200, {
                    'Content-type': 'text/html'
                });
                response.write(data);
                response.end();
            });
        } else if (route == '/chat.js') {
            fs.readFile('./chat.js', function(err, data) {
                if (err) {
                    response.writeHead(500);
                    response.write('Internal server error');
                    return response.end();
                }

                response.writeHead(200, {
                    'Content-type': 'application/javascript'
                });
                response.write(data);
                response.end();
            });
        } else {
            response.writeHead(404);
            response.end('Not Found');
        }

    }).listen(9999);

};

// TODO add users class with: getters/setters for friends, hasFriend etc
// better error handling
// put socket stuff in separate file
// get rid of needing to pass the username
// chat with multiple friends
// stop chat with one friend

function setUpSocket() {

    var io = require('socket.io').listen(server),
        users = {};

    io.on('connection', function(socket) {

        socket.emit('connected');

        socket.on('set-name', function(data) {
            socket.emit('name-set');
            users[data] = { id: socket.id };
            socket.set('user', data);

            io.sockets.emit('friends', users);
        });

        socket.on('start-chat', function(data) {
            var friendId = users[data.friend].id,
                userId = users[data.user].id;

            users[data.user].friend =  data.friend;
            users[data.friend].friend = data.user;

            io.sockets.socket(friendId).emit('chat-started', data.user);
            io.sockets.socket(userId).emit('chat-started', data.friend);
        });

        socket.on('typing', function(data) {
            var friendId;

            if (!users[data.user].friend) {
                socket.emit('error', { message: 'not chatting with anyone' });
                return;
            }

            friendId = users[users[data.user].friend].id;

            io.sockets.socket(friendId).emit('chat-input', data.user + ' is typing');
        });

        socket.on('deleted', function(data) {
            var friendId = users[users[data.user].friend].id;

            io.sockets.socket(friendId).emit('chat-deleted');
        });

        socket.on('submit', function(data) {
            var friendId;

            if (!users[data.user].friend) {
                socket.emit('error', { message: 'not chatting with anyone' });
                return;
            }

            friendId= users[users[data.user].friend].id;

            io.sockets.socket(friendId).emit('chat-recieved', {
                user: data.user,
                message: data.message
            });
        });

        socket.on('disconnect', function() {
            if (!users) {
                return;
            }

            socket.get('user', function(err, name) {
                var friendId;

                if (users[name] && users[name].friend) {
                    friendId = users[users[name].friend].id;
                    io.sockets.socket(friendId).emit('chat-ended');

                    delete users[users[name].friend].friend;
                } else {
                    io.sockets.emit('friend-disconnected', name);
                }

                delete users[name];
            });
        });

    });

};

function start() {
    createServer();
    setUpSocket();
};


exports.start = start;
