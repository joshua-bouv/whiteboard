const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.on('connection', socket => {
    // To draw whiteboard across all clients
    socket.on('drawing', (data) => {
        socket.to(data.room).broadcast.emit('drawing', data)
    });

    // To clear whiteboard across all clients
    socket.on('clear', (room) => socket.to(room).broadcast.emit('clear'));

    // To change whiteboard
    socket.on('joinRoom', (room) => {
        socket.leaveAll();
        socket.join(room)
    });
});

const port = 8080;
http.listen(port,() => console.log(`listening on port ${port}`));