const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let board1 = []
let board1Drawing = []

io.on('connection', socket => {
    // To draw whiteboard across all clients
    socket.on('drawing', (data) => {
        data['user'] = socket.id
        socket.to(data.room).broadcast.emit('drawing', data)
        board1Drawing[socket.id].push({user:socket.id, xStart:data.xStart, yStart:data.yStart, xEnd:data.xEnd, yEnd:data.yEnd, color:data.color})
    });

    // To clear whiteboard across all clients
    socket.on('clear', (room) => {
        board1 = []
        socket.to(room).broadcast.emit('clear')
    });

    // To undo a change on the whiteboard
    socket.on('undo', (room) => {
        io.in(room).emit('undo')
    });

    socket.on('lineCompleted', (room) => {
        let i;
        for (i = 0; i < board1Drawing[socket.id].length; i++) {
            board1.push(board1Drawing[socket.id][i])
        }
        board1Drawing[socket.id] = []
        socket.to(room).broadcast.emit('lineCompleted', {user:socket.id})
    });

    // To change whiteboard
    socket.on('joinRoom', (room) => {
        socket.leaveAll();
        socket.join(room)
        board1Drawing[socket.id] = []
        let i;
        for (i = 0; i < board1.length; i++) {
            let data = {}
            data.xStart = board1[i].xStart
            data.yStart = board1[i].yStart
            data.xEnd = board1[i].xEnd
            data.yEnd = board1[i].yEnd
            data.color = board1[i].color
            socket.emit('drawing', data)
        }
    });
});

const port = 8080;
http.listen(port,() => console.log(`listening on port ${port}`));