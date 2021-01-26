const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});
const {MongoClient} = require('mongodb');

async function main(){
    const client = new MongoClient("mongodb+srv://whiteboard:siEuqzAie1kGjgi8@cluster0.nlqhr.mongodb.net/whiteboards?retryWrites=true&w=majority");

    try {
        await client.connect();

        io.on('connection', socket => {
            // To join a whiteboard
            socket.on('joinRoom', (room) => {
                socket.leaveAll();
                socket.join(room);
                console.log("User connected to room "+room)
            });

            // To start the drawing of a new object
            socket.on('objectStart', (data) => {
                data['user'] = socket.id;
                socket.to("123").emit('objectStart', data);
            });

            // To draw whiteboard across all clients
            socket.on('drawing', (data) => {
                data['user'] = socket.id;
                socket.to("123").broadcast.emit('drawing', data);
            });

            socket.on('objectEnd', (data) => {
                data['user'] = socket.id;
                socket.to("123").broadcast.emit('objectEnd', data);
            });
        });

        http.listen(8080,() => console.log(`Whiteboard server active`));
    } catch (e) {
        console.error(e);
    }
}

main().catch(console.error);