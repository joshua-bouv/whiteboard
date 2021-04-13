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
        const whiteboards = client.db("whiteboards");

        // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
        function makeID(length) {
            let result = '';
            let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let charactersLength = characters.length;
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        async function sendWhiteboardToClient(board, socket) {
            try {
                whiteboards.collection(board).find({}).forEach(function(doc) {
                    socket.emit('streamObject', doc)
                }, function(err) {
                    console.log(err)
                });
            } catch (e) {
                console.log("Error here")
                console.error(e)
            }
        }

        async function addObjectToBoard(board, data) {
            try {
                await whiteboards.collection(board).insertOne(data);
            } catch (e) {
                console.error(e)
            }
        }

        async function updateObjectOnBoard(board, data) {
            try {
                await whiteboards.collection(board).findOneAndUpdate({_id:data._id}, {$set: {}})
            } catch (e) {
                console.error(e)
            }
        }

        async function clearBoard(board) {
            try {
                await whiteboards.collection(board).deleteMany({});
            } catch (e) {
                console.error(e)
            }
        }

        async function undoBoard(board) {
            try {
                await whiteboards.collection(board).findOneAndDelete({}, {sort: {_id: -1}})
            } catch (e) {
                console.error(e)
            }
        }

        io.on('connection', socket => {
            function addUser(room) {
                socket.leaveAll();
                socket.join(room);
                console.log("User connected to room "+room)
            }

            function makeNewWhiteboard() {
                let newWhiteboard = makeID(9);
                let searchForUniqueID = true;
                while (searchForUniqueID) {
                    let alreadyExists = false;
                    whiteboards.listCollections({name: newWhiteboard})
                        .next(function (err, colExists) {
                            if (colExists) {
                                alreadyExists = true
                            }
                        });

                    if (alreadyExists) {
                        newWhiteboard = makeID(9);
                    } else {
                        searchForUniqueID = false
                    }
                }

                whiteboards.createCollection(newWhiteboard);
                addUser(newWhiteboard)
                // give user permission to access whiteboard if required

                return newWhiteboard
            }

            // To request a unique whiteboard
            socket.on('requestRoom', () => {

            });


            // To request a unique whiteboard
            socket.on('requestRoom', () => {
                let newWhiteboard = makeNewWhiteboard()
            });

            // To join a whiteboard
            socket.on('joinRoom', (room) => {
                addUser(room)
                sendWhiteboardToClient(room, socket)
            });

            // To create whiteboard
            socket.on('newRoom', () => {
                let newWhiteboard = makeNewWhiteboard()
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
                data.object['user'] = socket.id;
                addObjectToBoard(data.room, data.object)
                socket.to(data.room).broadcast.emit('objectEnd', data.object.user);
            });

            // To update an object on the whiteboard
            socket.on('updateObject', (data) => {
                //updateObjectOnBoard("123", data)
                socket.to("123").broadcast.emit('updateObject', data);
            });

            // To clear whiteboard across all clients
            socket.on('clearWhiteboard', (room) => {
                socket.to(room).broadcast.emit('clearWhiteboard');
                clearBoard(room)
            });

            // To undo a change on the whiteboard
            socket.on('undoWhiteboard', (room) => {
                undoBoard(room)
                socket.to(room).broadcast.emit('undoWhiteboard');
            });

            // To redo a change on the whiteboard
            socket.on('redoWhiteboard', (data) => {
                data.object['user'] = socket.id;
                addObjectToBoard(data.room, data.object)
                socket.to(data.room).broadcast.emit('redoWhiteboard');
            });
        });

        http.listen(8080,() => console.log(`Whiteboard server active`));
    } catch (e) {
        console.error(e);
    }
}

main().catch(console.error);