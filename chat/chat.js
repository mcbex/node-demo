var Chatter = function(id) {
    this.client = document.getElementById(id);
    this.input = this.client.getElementsByTagName('input')[0];
    this.output = this.client.getElementsByTagName('div')[0];
};

Chatter.prototype.submit = function(inputType, inputValue) {
    var elem;

    this.socket.emit('submit', { 
        message: this.value
    });

    elem = document.createElement('p');
    elem.textContent = 'me: ' + this.value;
    this.output.appendChild(elem);
};

Chatter.prototype.typing = function() {
    this.value = this.input.value;

    if (this.value) {
        this.socket.emit('typing');
    } else {
        this.socket.emit('deleted');
    }
};

Chatter.prototype._listenToChats = function() {
    var self = this,
        elem;

    this.socket.on('chat-started', function(data) {
        self.status.textContent = 'Chatting with ' + data.name;
        self.friend = data;
    });

    this.socket.on('chat-ended', function() {
        document.getElementById('friends').innerHTML = '';
        self.status.textContent = 'no friends online';
        delete self.friend;
    });

    this.socket.on('chat-input', function(data) {
        self.status.textContent = data;
    });

    this.socket.on('chat-deleted', function() {
        self.status.textContent = '';
    });

    this.socket.on('chat-recieved', function(data) {
        elem = document.createElement('p');
        elem.textContent = data.user + ': ' + data.message;
        self.output.appendChild(elem);
        self.status.textContent = 'Chatting with ' + data.user;
    });

    this.socket.on('friend-disconnected', function(data) {
        document.getElementById('friends').innerHTML = '';
        self.status.textContent = 'no friends online';
    });
};

Chatter.prototype.chatsWith = function(friend) {
    var self = this;

    this.socket.emit('start-chat', {
        friendId: friend
    });
};

Chatter.prototype._makeFriendsContainer = function() {
    var friends = document.getElementById('friends');

    if (friends) {
        friends.innerHTML = '';
    } else {
        friends = document.createElement('div');
        friends.setAttribute('id', 'friends');
        this.client.appendChild(friends);
    }

    return friends;
};

Chatter.prototype._makeButton = function(data) {
    var button, self = this;

    button = document.createElement('button');
    button.setAttribute('id', data.id);
    button.setAttribute('data-name', data.name);
    button.textContent = 'Chat with ' + data.name;
    button.addEventListener('click', function() {
        self.chatsWith(button.id);
        self.status.textContent = 'Chatting with ' + button['data-name'];
    });

    return button;

};

Chatter.prototype.getFriends = function() {
    var self = this,
        wrapper, status, button;

    self.socket.on('friends', function(data) {
        wrapper = self._makeFriendsContainer();

        for (var i = 0, l = data.length; i < l; i++) {

            if (data[i].name != self.username) {
                button = self._makeButton(data[i]);
                wrapper.appendChild(button);
            }
        }

        if (!self.status) {
            status = document.createElement('p');
            status.setAttribute('id', 'status');
            self.status = status;
            self.client.appendChild(status);
        }

        if (!button) {
           self.status.textContent = 'no friends online';
        } else {
            self.status.textContent = '';
        }
    });

    this._listenToChats();
};

Chatter.prototype.setName = function() {
    var self = this;

    this.username = window.prompt('Enter a username');

    if (this.username) {
        this.socket.emit('set-name', this.username);
        this.getFriends();

        this.socket.on('name-set', function() {
            self.client.setAttribute('data-username', self.username);
            self.output.textContent = 'Hello ' + self.username;
        });
    }
};

Chatter.prototype.init = function() {
    var self = this;

    this.socket = io.connect('http://localhost:9999');

    this.socket.on('error', function(data) {
        window.alert(data.message);
    });

    this.socket.on('connected', function() {
        self.setName();
    });
};

window.onload = function() {
    var input = document.getElementById('chatter'),
        button = document.getElementsByTagName('button')[0],
        client = new Chatter('user');

    input.addEventListener('input', function(e) {
        client.typing();
    });

    button.addEventListener('click', function(e) {
        client.submit();
    });

    client.init();
}
