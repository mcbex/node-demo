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
// chat with multiple friends
// stop chat with one friend
// standardize api so we always expect the same arg type? obj?
// entered text event


function Users() {
    this.users = {};
}

Users.prototype.addUser = function(id, name) {
    this.users[id] = {
        id: id,
        name: name
    };
};

Users.prototype.getUser = function(id) {
    return this.users[id];
};

Users.prototype.getAllUsers = function() {
    var all = [];

    for (var prop in this.users) {
        all.push(this.users[prop]);
    }

    return all;
};

Users.prototype.setFriend = function(id, friendId) {
    this.users[id].friend = friendId;
    this.users[friendId].friend = id;
};

Users.prototype.getFriend = function(id) {
    var user = this.users[id],
        friend = user.friend;

    return this.users[friend];
};

Users.prototype.hasFriends = function(id) {
    return !!this.users[id].friend;
};

Users.prototype.unsetFriend = function(id) {
    var user = this.users[id],
        friend = this.getFriend(id);

    user && delete user.friend;
    friend && delete friend.friend;
};

Users.prototype.deleteUser = function(id) {
    this.unsetFriend(id);

    delete this.users[id];
};


function setUpSocket() {

    var io = require('socket.io').listen(server),
        users = new Users();

    io.on('connection', function(socket) {

        socket.emit('connected');

        socket.on('set-name', function(data) {
            users.addUser(socket.id, data);

            socket.emit('name-set');
            io.sockets.emit('friends', users.getAllUsers());
        });

        socket.on('start-chat', function(data) {
            var user = users.getUser(socket.id),
                friend;

            users.setFriend(socket.id, data.friendId);
            friend = users.getFriend(user.id);

            io.sockets.socket(friend.id).emit('chat-started', user);
            socket.emit('chat-started', friend);
        });

        socket.on('typing', function() {
            if (!users.hasFriends(socket.id)) {
                socket.emit('error', { message: 'Not chatting with anyone' });
                return;
            }

            io.sockets.socket(users.getFriend(socket.id).id)
                .emit('chat-input', users.getUser(socket.id).name + ' is typing');
        });

        socket.on('deleted', function() {
            io.sockets.socket(users.getFriend(socket.id).id)
                .emit('chat-deleted');
        });

        socket.on('submit', function(data) {
            if (!users.hasFriends(socket.id)) {
                socket.emit('error', { message: 'Not chatting with anyone' });
                return;
            }

            io.sockets.socket(users.getFriend(socket.id).id)
                .emit('chat-recieved', {
                    user: users.getUser(socket.id).name,
                    message: data.message
                });
        });

        socket.on('disconnect', function() {
            var user = users.getUser(socket.id);

            if (!user) {
                return;
            }

            if (users.hasFriends(socket.id)) {
                io.sockets.socket(users.getFriend(socket.id).id)
                    .emit('chat-ended', user);
            } else {
                io.sockets.emit('friend-disconnected', user);
            }

            users.deleteUser(socket.id);
        });

    });

};

function start() {
    createServer();
    setUpSocket();
};


exports.start = start;
