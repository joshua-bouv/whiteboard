import React, { useRef, useEffect } from 'react';
import io from 'socket.io-client';
import '../styles/board.css';

const Board = () => {
    const canvasRef = useRef(null);
    const socketRef = useRef();
    const textRef = useRef(null);
    const roomRef = useRef(null);
    let room = "example";
    let color = 'black';
    let drawingType = "line";
    let lineSize = 5;
    let whiteboardObjects = [];

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const colorElements = document.getElementsByClassName('color');
        const current = {};

        let holdingObject = []; // TEMP, MESSY BUT PROOF OF CONCEPT
        holdingObject['self'] = [];

        let holdingCircle = []; // TEMP, MESSY BUT PROOF OF CONCEPT
        holdingCircle['self'] = [];

        const getColorHex = [];
        getColorHex['black'] = '#000000';
        getColorHex['red'] = '#e74c3c';
        getColorHex['green'] = '#27ae60';
        getColorHex['blue'] = '#2980b9';
        getColorHex['purple'] = '#9b59b6';
        getColorHex['grey'] = '#95a5a6';
        getColorHex['yellow'] = '#f1c40f';

        for (let i = 0; i < colorElements.length; i++) {
            colorElements[i].addEventListener('click', (e) => color = getColorHex[e.target.className.split(' ')[1]], false);
        }

        let isDrawing = false;

        // What draws the lines on the whiteboard
        const drawLine = (xStart, yStart, xEnd, yEnd, color, user, addToHolding, emit) => {
            context.beginPath();
            context.moveTo(xStart, yStart); // A line is lots of little lines
            context.lineTo(xEnd, yEnd);
            context.strokeStyle = color;
            context.lineWidth = lineSize;
            context.stroke();

            if (addToHolding) {
                holdingObject[user].push({type: "line", xStart: xStart, yStart: yStart, xEnd: xEnd, yEnd: yEnd, color: color})
            }

            if (!emit) { return; }
            const w = canvas.width;
            const h = canvas.height;

            socketRef.current.emit('drawing', {
                xStart: xStart / w,
                yStart: yStart / h,
                xEnd: xEnd / w,
                yEnd: yEnd / h,
                type: "line",
                color,
                room,
            });
        };

        const drawText = (xStart, yStart, color, text, user, addToHolding, emit) => {
            context.font = "30px Arial";
            context.fillStyle = color;
            context.fillText(text, xStart, yStart);

            if (addToHolding) {
                holdingObject[user] = {type: "text", xStart: xStart, yStart: yStart, text: text, color: color} // add to canvas storage
            }

            if (!emit) { return; }
            const w = canvas.width;
            const h = canvas.height;

            socketRef.current.emit('drawing', {
                xStart: xStart / w,
                yStart: yStart / h,
                type: "text",
                text,
                color,
                room,
            });
        };

        const drawSquare = (xStart, yStart, xEnd, yEnd, color, user, addToHolding, emit) => {
            if (addToHolding) {
                redrawWhiteboard();
            }

            let xSize = xEnd - xStart;
            let ySize = yEnd - yStart;

            context.strokeStyle = color;
            context.strokeRect(xStart, yStart, xSize, ySize);

            if (addToHolding) {
                holdingObject[user] = {type: "square", xStart: xStart, yStart: yStart, xEnd: xEnd, yEnd: yEnd, color: color} // add to canvas storage
            }

            if (!emit) { return; }
            const w = canvas.width;
            const h = canvas.height;

            socketRef.current.emit('drawing', {
                xStart: xStart / w,
                yStart: yStart / h,
                xEnd: xEnd / w,
                yEnd: yEnd / h,
                type: "square",
                color,
                room,
            });
        };

        const drawCircle = (xStart, yStart, xEnd, yEnd, color, user, addToHolding, emit) => {
            if (addToHolding) {
                redrawWhiteboard();
            }

            let radius;
            let xSize = xEnd - xStart;
            let ySize = yEnd - yStart;

            if (xSize >= ySize) {
                if (xSize >= 0) {
                    radius = xSize;
                } else {
                    radius = -xSize;
                }
            } else {
                if (ySize >= 0) {
                    radius = ySize;
                } else {
                    radius = -ySize;
                }
            }

            context.beginPath();
            context.arc(xStart, yStart, radius, 0, 2*Math.PI);
            context.strokeStyle = color;
            context.stroke();

            if (addToHolding) {
                holdingObject[user] = {type: "circle", xStart: xStart, yStart: yStart, xEnd: xEnd, yEnd: yEnd, color: color, radius: radius} // add to canvas storage
            }

            if (!emit) { return; }
            const w = canvas.width;
            const h = canvas.height;

            socketRef.current.emit('drawing', {
                xStart: xStart / w,
                yStart: yStart / h,
                xEnd: xEnd / w,
                yEnd: yEnd / h,
                type: "circle",
                color,
                room,
            });
        };

        // Sets the size of the whiteboard canvas
        const resizeBoard = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            redrawWhiteboard()
        };

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        window.addEventListener('resize', resizeBoard, false);

        // Starts drawing lines
        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            current.x = e.clientX;
            current.y = e.clientY;
            if (drawingType === "circle") {
                drawCircle(current.x, current.y, current.x, current.y, color, 'self', true, true)
            } else if (drawingType === "text") {
                drawText(current.x, current.y, color, textRef.current.value, 'self', true, true);
                socketRef.current.emit('objectCompleted', {room: room, type: drawingType});
                whiteboardObjects.push(holdingObject['self']);
                holdingObject['self'] = [];
            } else if (drawingType === "square") {
                drawSquare(current.x, current.y, e.clientX, e.clientY, color, 'self', true, true)
            }
        }, false);

        // For drawing whilst moving the mouse
        const onMouseMove = (e) => {
            if (!isDrawing) { return; }
            if (drawingType === "line") {
                drawLine(current.x, current.y, e.clientX, e.clientY, color, 'self', true, true);
                current.x = e.clientX;
                current.y = e.clientY;
            } else if (drawingType === "circle") {
                drawCircle(current.x, current.y, e.clientX, e.clientY, color, 'self', true, true)
            } else if (drawingType === "square") {
                drawSquare(current.x, current.y, e.clientX, e.clientY, color, 'self', true, true)
            }
        };

        canvas.addEventListener('mousemove', onMouseMove, false);

        // Stop drawling the lines
        const onMouseUp = (e) => {
            if (!isDrawing) { return; }
            isDrawing = false;
            if (drawingType === "line") {
                drawLine(current.x, current.y, e.clientX, e.clientY, color, 'self', true,true);
                whiteboardObjects.push(holdingObject['self']);
                holdingObject['self'] = [];
            } else if (drawingType === "circle") {
                whiteboardObjects.push(holdingObject['self']);
                holdingObject['self'] = [];
            } else if (drawingType === "square") {
                whiteboardObjects.push(holdingObject['self']);
                holdingObject['self'] = [];
            }
            if (drawingType !== "text") {
                socketRef.current.emit('objectCompleted', {room: room, type: drawingType});
            }
        };

        const onMouseUpExt = (data) => {
            const w = canvas.width;
            const h = canvas.height;

            whiteboardObjects.push(holdingObject[data.user]);
            holdingObject[data.user] = []
        };

        canvas.addEventListener('mouseup', onMouseUp, false);
        canvas.addEventListener('mouseout', onMouseUp, false);
        //canvas.addEventListener('wheel', false, false);

        // Draws on the whiteboard from incoming net messages
        const onDrawingEvent = (data) => {
            if (holdingObject[data.user] == null) {
                holdingObject[data.user] = []
            }

            const w = canvas.width;
            const h = canvas.height;
            if (data.type === "line") {
                drawLine(data.xStart * w, data.yStart * h, data.xEnd * w, data.yEnd * h, data.color, data.user, true,false);
            } else if (data.type === "circle") {
                drawCircle(data.xStart * w, data.yStart * h, data.xEnd * w, data.yEnd * h, data.color, data.user, true, false)
            } else if (data.type === "square") {
                drawSquare(data.xStart * w, data.yStart * h, data.xEnd * w, data.yEnd * h, data.color, data.user, true, false)
            } else if (data.type === "text") {
                drawText(data.xStart * w, data.yStart * h, data.color, data.text, data.user, true, false)
            }
        };

        // Clears the whiteboard
        const onClearEvent = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            whiteboardObjects = []
        };

        const redrawWhiteboard = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < whiteboardObjects.length; i++) { // all the objects
                if (whiteboardObjects[i].type === "circle") {
                    drawCircle(whiteboardObjects[i].xStart, whiteboardObjects[i].yStart, whiteboardObjects[i].xEnd, whiteboardObjects[i].yEnd, whiteboardObjects[i].color, 'self', false, false)
                } else if (whiteboardObjects[i].type === "square") {
                    drawSquare(whiteboardObjects[i].xStart, whiteboardObjects[i].yStart, whiteboardObjects[i].xEnd, whiteboardObjects[i].yEnd, whiteboardObjects[i].color, 'self', false, false)
                } else if (whiteboardObjects[i].type === "text") {
                    drawText(whiteboardObjects[i].xStart, whiteboardObjects[i].yStart, whiteboardObjects[i].color, whiteboardObjects[i].text, 'self', false, false)
                } else if (whiteboardObjects[i][0].type === "line") {
                    for (let j = 0; j < whiteboardObjects[i].length; j++) { // all the plots in the lines
                        drawLine(whiteboardObjects[i][j].xStart, whiteboardObjects[i][j].yStart, whiteboardObjects[i][j].xEnd, whiteboardObjects[i][j].yEnd, whiteboardObjects[i][j].color, 'self', false, false)
                    }
                } else {
                    console.log("DEBUG: INVALID OBJECT TYPE")
                }
            }
        };

        const onUndoEvent = () => {
            whiteboardObjects.pop();
            redrawWhiteboard()
        };

        // socket net messages
        socketRef.current = io.connect(':8080/');
        socketRef.current.on('drawing', onDrawingEvent);
        socketRef.current.on('clear', onClearEvent);
        socketRef.current.on('undo', onUndoEvent);
        socketRef.current.on('objectCompleted', onMouseUpExt);
        socketRef.current.emit('joinRoom', room);
    });

    // Clear whiteboard button
     function clearWhiteboard() {
         canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         whiteboardObjects = [];
         socketRef.current.emit('clear', room);
     }

    // Undo draw button
    function undoDraw() {
        socketRef.current.emit('undo', room);
    }

    function createRoom() {
        socketRef.current.emit('createRoom', room);
    }

    function joinRoom() {
        canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        room = roomRef.current.value;
        socketRef.current.emit('joinRoom', roomRef.current.value);
    }

    function setType() { // lazy need to make clean
        drawingType = "circle"
    }

    function setType2() { // lazy need to make clean
        drawingType = "text"
    }

    function setType3() { // lazy need to make clean
        drawingType = "square"
    }

    function setType4() { // lazy need to make clean
        drawingType = "line"
    }

    return (
        <div>
            <canvas ref={canvasRef} className="whiteboard" />
            <div className="colors">
                <div className="color black" />
                <div className="color red" />
                <div className="color green" />
                <div className="color blue" />
                <div className="color purple" />
                <div className="color grey" />
                <div className="color yellow" />
            </div>

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
            <div className="buttons">
                <button className="button tools" onClick={setType4}><i className="fa fa-pencil"/></button>
                <button className="button tools" onClick={setType}><i className="fa fa-circle-o"/></button>
                <button className="button tools" onClick={setType2}><i className="fa fa-font"/></button>
                <textarea ref={textRef} defaultValue='example text'/>
                <button className="button tools" onClick={setType3}><i className="fa fa-square-o"/></button>
                <button className="button tools" onClick={undoDraw}><i className="fa fa-undo"/></button>
                <button className="button tools" onClick={clearWhiteboard}><i className="fa fa-trash"/></button>
                <button className="button toolsL" onClick={createRoom}>Create room</button>
                <textarea ref={roomRef} defaultValue='roomid'/>
                <button className="button toolsL" onClick={joinRoom}>Join room</button>
            </div>
        </div>
    );
};

export default Board;