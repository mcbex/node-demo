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

// TODO
// better error handling
// put socket stuff in separate file
// get rid of needing to pass the username
// chat with multiple friends
// stop chat with one friend

// store users by id instead of name?

function Users() {
    this.users = {};
}

Users.prototype.addUser = function(name, id) {
    this.users[name] = {
        name: name,
        id: id
    };
};

Users.prototype.getUser = function(name) {
    return this.users[name];
};

Users.prototype.getAllUsers = function() {
    var all = [];

    for (var prop in this.users) {
        all.push(this.users[prop]);
    }

    return all;
};

Users.prototype.setFriend = function(name, friendName) {
    this.users[name].friend = friendName;
    this.users[friendName].friend = name;
};

Users.prototype.getFriend = function(name) {
    var user = this.users[name],
        friend = user.friend;

    return this.users[friend];
};

Users.prototype.hasFriends = function(name) {
    return !!this.users[name].friend;
};

Users.prototype.unsetFriend = function(name) {
    var user = this.users[name],
        friend = this.getFriend(name);

    user && delete user.friend;
    friend && delete friend.friend;
};

Users.prototype.deleteUser = function(name) {
    this.unsetFriend(name);

    delete this.users[name];
};


function setUpSocket() {

    var io = require('socket.io').listen(server),
        users = new Users();

    io.on('connection', function(socket) {

        socket.emit('connected');

        socket.on('set-name', function(data) {
            users.addUser(data, socket.id);
            socket.set('user', data);

            socket.emit('name-set');
            io.sockets.emit('friends', users.getAllUsers());
        });

        socket.on('start-chat', function(data) {
            users.setFriend(data.user, data.friend);

            io.sockets.socket(users.getFriend(data.user).id)
                .emit('chat-started', data.user);
            io.sockets.socket(users.getUser(data.user).id)
                .emit('chat-started', data.friend);
        });

        socket.on('typing', function(data) {
            if (!users.hasFriends(data.user)) {
                socket.emit('error', { message: 'not chatting with anyone' });
                return;
            }

            io.sockets.socket(users.getFriend(data.user).id)
                .emit('chat-input', data.user + ' is typing');
        });

        socket.on('deleted', function(data) {
            io.sockets.socket(users.getFriend(data.user).id)
                .emit('chat-deleted');
        });

        socket.on('submit', function(data) {
            if (!users.hasFriends(data.user)) {
                socket.emit('error', { message: 'not chatting with anyone' });
                return;
            }

            io.sockets.socket(users.getFriend(data.user).id)
                .emit('chat-recieved', {
                    user: data.user,
                    message: data.message
                });
        });

        socket.on('disconnect', function() {
            socket.get('user', function(err, name) {
                if (!users.getUser(name)) {
                    return;
                }

                if (users.hasFriends(name)) {
                    io.sockets.socket(users.getFriend(name).id)
                        .emit('chat-ended');
                } else {
                    io.sockets.emit('friend-disconnected', name);
                }

                users.deleteUser(name);
            });
        });

    });

};

function start() {
    createServer();
    setUpSocket();
};


exports.start = start;
