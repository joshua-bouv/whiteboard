const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const {MongoClient} = require('mongodb');

async function main(){
    const client = new MongoClient("mongodb+srv://whiteboard:siEuqzAie1kGjgi8@cluster0.nlqhr.mongodb.net/whiteboards?retryWrites=true&w=majority");

    try {
        await client.connect();
        const whiteboards = client.db("whiteboards");
        let holdingLine = [] // needs improving for a board-by-board basis aswell rather than globally per user

        async function addLineToBoard(board, author, line) {
            try {
                await whiteboards.collection(board).insertOne({author: author, plots: line});
            }catch (e) {
                console.error(e)
            }
        }

        async function sendWhiteboardToClient(board, socket) {
            try {
                whiteboards.collection(board).find({}).forEach(function(doc) {
                    let plots = doc.plots;
                    let j;
                    for (j = 0; j <plots.length; j++) {
                        let data = {}
                        data.xStart = plots[j].xStart
                        data.yStart = plots[j].yStart
                        data.xEnd = plots[j].xEnd
                        data.yEnd = plots[j].yEnd
                        data.color = plots[j].color
                        socket.emit('drawing', data)
                    }
                }, function(err) {
                    console.log(err)
                });
            }catch (e) {
                console.error(e)
            }
        }

        io.on('connection', socket => {
            // To draw whiteboard across all clients
            socket.on('drawing', (data) => {
                data['user'] = socket.id
                socket.to(data.room).broadcast.emit('drawing', data)
                holdingLine[socket.id].push({user:socket.id, xStart:data.xStart, yStart:data.yStart, xEnd:data.xEnd, yEnd:data.yEnd, color:data.color})
            });

            // To clear whiteboard across all clients
            socket.on('clear', (room) => {
                socket.to(room).broadcast.emit('clear')
                // handle database side
            });

            // To undo a change on the whiteboard
            socket.on('undo', (room) => {
                io.in(room).emit('undo')
                // handle database side
            });

            // To signify a line has been completed by a client and to add to the database
            socket.on('lineCompleted', (room) => {
                addLineToBoard("example", socket.id, holdingLine[socket.id])
                holdingLine[socket.id] = []
                socket.to(room).broadcast.emit('lineCompleted', {user:socket.id})
            });

            // To change whiteboard
            socket.on('joinRoom', (room) => {
                socket.leaveAll();
                socket.join(room);
                holdingLine[socket.id] = [];
                sendWhiteboardToClient("example", socket);
            });

            // To create whiteboard
            socket.on('createRoom', () => {
                socket.leaveAll();
                // generate new ID for whiteboard
                //socket.join(room);
                holdingLine[socket.id] = [];
                // create collection in database of whiteboard
                // give user permission to access whiteboard if required
            });
        });

        http.listen(8080,() => console.log(`Whiteboard server active`));
    } catch (e) {
        console.error(e);
    }
}

main().catch(console.error);