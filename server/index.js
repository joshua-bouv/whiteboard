const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});
const {MongoClient} = require('mongodb');
// https://stackoverflow.com/questions/4902569/node-js-mongodb-select-document-by-id-node-mongodb-native
const ObjectId = require('mongodb').ObjectID;

async function main(){
    const client = new MongoClient("mongodb+srv://whiteboard:siEuqzAie1kGjgi8@cluster0.nlqhr.mongodb.net/whiteboards?retryWrites=true&w=majority");

    try {
        await client.connect();
        const whiteboards = client.db("whiteboards");
        const storage = client.db("storage");

        // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
        function makeID(length) {
            let result = '';
            let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let charactersLength = characters.length;
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }

            let searchForUniqueID = true;
            while (searchForUniqueID) {
                let alreadyExists = false;
                whiteboards.listCollections({name: result})
                    .next(function (err, colExists) {
                        if (colExists) {
                            alreadyExists = true
                        }
                    });

                if (alreadyExists) {
                    result = makeID(9);
                } else {
                    searchForUniqueID = false
                }
            }

            return result;
        }

        async function sendWhiteboardToClient(board, socket) {
            try {
                await whiteboards.collection(board).find({}).forEach(function(doc) {
                    socket.emit('streamObject', doc)
                }, function(err) {});  // finished finding objects
            } catch (e) {
                console.error("Error sending whiteboard to client")
                console.error(e)
            }
        }

        async function addObjectToBoard(board, data) {
            try {
                await whiteboards.collection(board).insertOne(data);
            } catch (e) {
                console.error("Error sending object to client")
                console.log(board)
                console.log(data)
                console.error(e)
            }
        }

        async function updateObjectOnBoard(board, data) {
            try {
                if (data.tool === "square") {
                    await whiteboards.collection(board).findOneAndUpdate({_id: new ObjectId(data._id)}, {$set: {points: data.points, size: data.size}})
                } else if (data.tool === "circle") { // circle
                    await whiteboards.collection(board).findOneAndUpdate({_id: new ObjectId(data._id)}, {$set: {points: data.points, radius: data.radius}})
                } else if (data.tool === "text") {
                    await whiteboards.collection(board).findOneAndUpdate({_id: new ObjectId(data._id)}, {$set: {text: data.text}})
                }
            } catch (e) {
                console.error("Error updating object to client")
                console.error(e)
            }
        }

        async function clearBoard(board) {
            try {
                await whiteboards.collection(board).deleteMany({});
            } catch (e) {
                console.error("Error clearing whiteboard")
                console.error(e)
            }
        }

        async function undoBoard(board) {
            try {
                await whiteboards.collection(board).findOneAndDelete({}, {sort: {_id: -1}})
            } catch (e) {
                console.error("Error undoing whiteboard")
                console.error(e)
            }
        }

        async function login(data, callback) {
            try {
                await storage.collection("users").findOne({user: data.user, password: data.password}).then(results => {
                    if (results) {
                        return callback(results['_id'])
                    }
                    return callback(false)
                })
            } catch (e) {
                console.error("Error logging in")
                console.error(e)
            }
        }

        async function register(data) {
            try {
                let uniqueUser = true
                await storage.collection("users").findOne({user: data.user}).then(results => {
                    if (results) {
                        uniqueUser = false
                    }
                })

                if (uniqueUser) {
                    await storage.collection("users").insertOne(data);
                }
            } catch (e) {
                console.error("Error registering user")
                console.error(e)
            }
        }

        async function getWhiteboards(userID, callback) {
            try {
                await storage.collection("permissions").find({owner: userID}).toArray().then(items => {
                    items = items.filter(whiteboard => whiteboard.snapshot !== null);
                    return callback(items)
                })
            } catch (e) {
                console.error("Error finding users whiteboards")
                console.error(e)
            }
        }

        async function changeGlobalPermission(data) {
            try {
                let userIsOwner = false
                await storage.collection("permissions").findOne({owner: data.user}).then(results => {
                    if (results) {
                        userIsOwner = true
                    }
                })

                if (userIsOwner) {
                    await storage.collection("permissions").findOneAndUpdate({name: data.room}, {$set: {permission: data.newPermission}})
                }
            } catch (e) {
                console.error("Error changing permission")
                console.error(e)
            }
        }

        async function updateSnapshot(room, image) {
            try {
                await storage.collection("permissions").findOneAndUpdate({name: room}, {$set: {snapshot: image}})
            } catch (e) {
                console.error("Error updating image")
                console.error(e)
            }
        }

        async function createCopyOfBoard(originalWhiteboard, copyWhiteboard) {
            try {
                await whiteboards.collection(originalWhiteboard).find().forEach(function(doc){
                    whiteboards.collection(copyWhiteboard).insertOne(doc);
                });
                await storage.collection("permissions").findOne({name: originalWhiteboard}).then(results => {
                    storage.collection("permissions").findOneAndUpdate({name: copyWhiteboard}, {$set: {snapshot: results.snapshot}})
                })
            } catch (e) {
                console.error("Failed to create copy of whiteboard")
                console.error(e)
            }
        }

        io.on('connection', socket => {
            function addUser(room) {
                socket.leaveAll();
                socket.join(room);
                console.error("User connected to room "+room)
            }

            function makeNewWhiteboard(userID) {
                let newWhiteboard = makeID(9);
                whiteboards.createCollection(newWhiteboard);
                storage.collection("permissions").insertOne({name: newWhiteboard, permission: 'read', owner: userID, writers: {}, snapshot: null});

                return newWhiteboard
            }

            // To login to website
            socket.on('login', (data) => {
                // escape stuff
                login(data, function(isLoggedIn) {
                    if (isLoggedIn) {
                        socket.emit('loggedIn', isLoggedIn)
                        socket.emit('displayNotification', "Hi "+data.user)
                        console.error("Logging in user "+data.user)
                    } else {
                        socket.emit('displayNotification', "Incorrect username/password")
                        console.error("User not found / wrong password")
                    }
                })
            });

            // To signup to website
            socket.on('signup', (data) => {
                register(data)
            });

            // To request a unique whiteboard
            socket.on('requestRoom', (data) => {
                let newWhiteboard = makeNewWhiteboard(data)
                addUser(newWhiteboard)
                socket.emit('setupWhiteboard', newWhiteboard)
            });

            // To join a whiteboard
            socket.on('joinRoom', (room) => {
                addUser(room)
                sendWhiteboardToClient(room, socket)
                socket.emit('setupWhiteboard', room)
                socket.emit('displayNotification', "Joined whiteboard "+room)
            });

            // To start the drawing of a new object
            socket.on('objectStart', (data) => {
                data['user'] = socket.id;
                socket.to(data.room).emit('objectStart', data);
            });

            // To draw whiteboard across all clients
            socket.on('drawing', (data) => {
                data['user'] = socket.id;
                socket.to(data.room).broadcast.emit('drawing', data);
            });

            socket.on('objectEnd', (data) => {
                if (data.object.length !== 0) {
                    data.object['user'] = socket.id;
                    addObjectToBoard(data.room, data.object)
                    updateSnapshot(data.room, data.image)
                    socket.to(data.room).broadcast.emit('objectEnd', data.object.user);
                }
            });

            // To update an object on the whiteboard
            socket.on('updateObject', (data) => {
                updateObjectOnBoard(data.room, data.object)
                socket.to(data.room).broadcast.emit('updateObject', data.object);
            });

            // To clear whiteboard across all clients
            socket.on('clearWhiteboard', (room) => {
                socket.to(room).broadcast.emit('clearWhiteboard');
                clearBoard(room)
                socket.to(room).emit('displayNotification', "Whiteboard cleared")
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

            // To load a whiteboard
            socket.on('loadWhiteboards', (userID) => {
                getWhiteboards(userID, function(whiteboards) {
                    socket.emit('loadWhiteboards', whiteboards);
                })
            });

            // To change the global permissions of a whiteboard
            socket.on('changeGlobalPermission', (data) => {
                changeGlobalPermission(data)
                let text = "Read-only"
                if (data.newPermission === "write") {
                    text = "Write"
                }
                socket.emit('displayNotification', "Permissions changed to "+text)
            })

            socket.on('createCopy', (data) => {
                let copyWhiteboardID = makeNewWhiteboard(data.session)
                createCopyOfBoard(data.room, copyWhiteboardID)
                addUser(copyWhiteboardID)
                sendWhiteboardToClient(copyWhiteboardID, socket)
                socket.emit('setupWhiteboard', copyWhiteboardID)
                socket.emit('displayNotification', "Joined whiteboard "+copyWhiteboardID)
            })
        });

        http.listen(8080,() => console.error(`Whiteboard server active`));
    } catch (e) {
        console.error("General error")
        console.error(e);
    }
}

main().catch(console.error);