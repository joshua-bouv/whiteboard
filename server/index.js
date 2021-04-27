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

        async function register(username) {
            try {
                let uniqueUser = true
                await storage.collection("users").findOne({user: username}).then(results => {
                    if (results) {
                        uniqueUser = false
                    }
                })

                if (uniqueUser) {
                    await storage.collection("users").insertOne(username);
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
                    await storage.collection("permissions").findOneAndUpdate({name: data.whiteboardID}, {$set: {permission: data.newPermission}})
                }
            } catch (e) {
                console.error("Error changing permission")
                console.error(e)
            }
        }

        async function updateSnapshot(whiteboardID, image) {
            try {
                await storage.collection("permissions").findOneAndUpdate({name: whiteboardID}, {$set: {snapshot: image}})
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

        let socketCurrentBoard = {}

        io.on('connection', socket => {
            function addUser(whiteboardID, username) {
                if (username === null) {
                    username = "guest"
                }
                socket.leaveAll();
                socketCurrentBoard[socket.id] = {whiteboardID: whiteboardID, username: username}
                socket.join(whiteboardID);

                console.log(username+" connected to whiteboard "+whiteboardID)
            }

            function makeNewWhiteboard(userID) {
                let newWhiteboard = makeID(9);
                whiteboards.createCollection(newWhiteboard);
                storage.collection("permissions").insertOne({name: newWhiteboard, permission: 'read', owner: userID, writers: {}, snapshot: null});

                return newWhiteboard
            }

            socket.on('disconnect', () => {
                if (socketCurrentBoard[socket.id] != null) {
                    console.log(socketCurrentBoard[socket.id].username + " disconnected form whiteboard "+socketCurrentBoard[socket.id].whiteboardID)
                    socketCurrentBoard[socket.id] = null
                }
            })

            // To login to website
            socket.on('login', (data) => {
                // escape stuff
                login(data, function(isLoggedIn) {
                    if (isLoggedIn) {
                        socket.emit('loggedIn', {uniqueID: isLoggedIn, username: data.user})
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
                register(data.user)
            });

            // To request a unique whiteboard
            socket.on('requestNewWhiteboard', (data) => {
                let newWhiteboardID = makeNewWhiteboard(data.uniqueID)
                addUser(newWhiteboardID, data.username)
                socket.emit('setupWhiteboard', newWhiteboardID)
            });

            // To join a whiteboard
            socket.on('joinWhiteboard', (data) => {
                addUser(data.whiteboardID, data.username)
                sendWhiteboardToClient(data.whiteboardID, socket)
                socket.emit('setupWhiteboard', data.whiteboardID)
                socket.emit('displayNotification', "Joined whiteboard "+data.whiteboardID)
            });

            // To start the drawing of a new object
            socket.on('objectStart', (data) => {
                data['user'] = socket.id;
                socket.to(data.whiteboardID).emit('objectStart', data);
            });

            // To draw whiteboard across all clients
            socket.on('drawing', (data) => {
                data['user'] = socket.id;
                socket.to(data.whiteboardID).broadcast.emit('drawing', data);
            });

            socket.on('objectEnd', (data) => {
                if (data.object.length !== 0) {
                    data.object['user'] = socket.id;
                    addObjectToBoard(data.whiteboardID, data.object)
                    updateSnapshot(data.whiteboardID, data.image)
                    socket.to(data.whiteboardID).broadcast.emit('objectEnd', data.object.user);
                }
            });

            // To update an object on the whiteboard
            socket.on('updateObject', (data) => {
                updateObjectOnBoard(data.whiteboardID, data.object)
                socket.to(data.whiteboardID).broadcast.emit('updateObject', data.object);
            });

            // To clear whiteboard across all clients
            socket.on('clearWhiteboard', (whiteboardID) => {
                socket.to(whiteboardID).broadcast.emit('clearWhiteboard');
                clearBoard(whiteboardID)
                socket.to(whiteboardID).emit('displayNotification', "Whiteboard cleared")
            });

            // To undo a change on the whiteboard
            socket.on('undoWhiteboard', (whiteboardID) => {
                undoBoard(whiteboardID)
                socket.to(whiteboardID).broadcast.emit('undoWhiteboard');
            });

            // To redo a change on the whiteboard
            socket.on('redoWhiteboard', (data) => {
                data.object['user'] = socket.id;
                addObjectToBoard(data.whiteboardID, data.object)
                socket.to(data.whiteboardID).broadcast.emit('redoWhiteboard');
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
                createCopyOfBoard(data.whiteboardID, copyWhiteboardID)
                addUser(copyWhiteboardID, data.username)
                sendWhiteboardToClient(copyWhiteboardID, socket)
                socket.emit('setupWhiteboard', copyWhiteboardID)
                socket.emit('displayNotification', "Joined whiteboard "+copyWhiteboardID)
            })
        });

        http.listen(8080,() => console.error(`!!!!! Whiteboard server active !!!!!`));
    } catch (e) {
        console.error("General error")
        console.error(e);
    }
}

main().catch(console.error);