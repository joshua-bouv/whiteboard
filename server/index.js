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
        const users = client.db("users");

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
                }, function(err) {});  // finished finding objects
            } catch (e) {
                console.log("Error sending whiteboard to client")
                console.error(e)
            }
        }

        async function addObjectToBoard(board, data) {
            try {
                await whiteboards.collection(board).insertOne(data);
            } catch (e) {
                console.log("Error sending object to client")
                console.error(e)
            }
        }

        async function updateObjectOnBoard(board, data) {
            try {
                await whiteboards.collection(board).findOneAndUpdate({_id:data._id}, {$set: {}})
            } catch (e) {
                console.log("Error updating object to client")
                console.error(e)
            }
        }

        async function clearBoard(board) {
            try {
                await whiteboards.collection(board).deleteMany({});
            } catch (e) {
                console.log("Error clearing whiteboard")
                console.error(e)
            }
        }

        async function undoBoard(board) {
            try {
                await whiteboards.collection(board).findOneAndDelete({}, {sort: {_id: -1}})
            } catch (e) {
                console.log("Error undoing whiteboard")
                console.error(e)
            }
        }

        async function login(data, callback) {
            try {
                await users.collection("users").findOne({user: data.user}).then(results => {
                    if (results) {
                        return callback(results['_id'])
                    }
                    return callback(false)
                })
            } catch (e) {
                console.log("Error logging in")
                console.error(e)
            }
        }

        async function register(data) {
            try {
                let uniqueUser = true
                await users.collection("users").findOne({user: data.user}).then(results => {
                    if (results) {
                        uniqueUser = false
                    }
                })

                if (uniqueUser) {
                    await users.collection("users").insertOne(data);
                }
            } catch (e) {
                console.log("Error registering user")
                console.error(e)
            }
        }

        async function getWhiteboards(userID) {
            try {
                let whiteboards = []
                await users.collection("permissions").find({owner: userID}).forEach(function(doc) {
                    whiteboards.push(doc)
                }, function(err) {});  // finished finding whiteboards

                return whiteboards
            } catch (e) {
                console.log("Error registering user")
                console.error(e)
            }
        }

        async function changeGlobalPermission(data) {
            try {
                let userIsOwner = false
                await users.collection("permissions").findOne({owner: data.user}).then(results => {
                    if (results) {
                        userIsOwner = true
                    }
                })

                if (userIsOwner) {
                    await users.collection("permissions").findOneAndUpdate({name: data.room}, {$set: {permission: data.newPermission}})
                }
            } catch (e) {
                console.log("Error changing permission")
                console.error(e)
            }
        }

        io.on('connection', socket => {
            function addUser(room) {
                socket.leaveAll();
                socket.join(room);
                console.log("User connected to room "+room)
            }

            function makeNewWhiteboard(userID) {
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
                users.collection("permissions").insertOne({name: newWhiteboard, permission: 'read', owner: userID, writers: {}});

                return newWhiteboard
            }

            // To login to website
            socket.on('login', (data) => {
                // escape stuff
                login(data, function(isLoggedIn) {
                    if (isLoggedIn) {
                        socket.emit('loggedIn', isLoggedIn)
                    } else {
                        console.log("User not found / wrong password")
                        // wrong password / doesn't exist
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
                data.object['user'] = socket.id;
                addObjectToBoard(data.room, data.object)
                socket.to(data.room).broadcast.emit('objectEnd', data.object.user);
            });

            // To update an object on the whiteboard
            socket.on('updateObject', (data) => {
                //updateObjectOnBoard(data.room, data)
                socket.to(data.room).broadcast.emit('updateObject', data);
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

            // To load a whiteboard
            socket.on('loadWhiteboards', (userID) => {
                socket.emit('loadWhiteboards', getWhiteboards(userID));
            });

            // To change the global permissions of a whiteboard
            socket.on('changeGlobalPermission', (data) => {
                changeGlobalPermission(data)
            })
        });

        http.listen(8080,() => console.log(`Whiteboard server active`));
    } catch (e) {
        console.log("General error")
        console.error(e);
    }
}

main().catch(console.error);