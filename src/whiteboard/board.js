import React, { useRef, useEffect } from 'react';
import io from 'socket.io-client';
import '../styles/board.css';

const Board = () => {
    const canvasRef = useRef(null);
    const socketRef = useRef();
    let room = "room1";
    let color = 'black';
    let lineSize = 5;
    let lines = []

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const colorElements = document.getElementsByClassName('color');
        const current = {};
        let holdingLine = [];
        holdingLine['self'] = [];

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
                holdingLine[user].push({xStart: xStart, yStart: yStart, xEnd: xEnd, yEnd: yEnd, color: color})
            }

            if (!emit) { return; }
            const w = canvas.width;
            const h = canvas.height;

            socketRef.current.emit('drawing', {
                xStart: xStart / w,
                yStart: yStart / h,
                xEnd: xEnd / w,
                yEnd: yEnd / h,
                color,
                room,
            });
        };

        // Sets the size of the whiteboard canvas
        const resizeBoard = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // redraw board
        };

        resizeBoard();

        window.addEventListener('resize', resizeBoard, false);

        // Starts drawing lines
        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            current.x = e.clientX;
            current.y = e.clientY;
        }, false);

        // For drawing whilst moving the mouse
        const onMouseMove = (e) => {
            if (!isDrawing) { return; }
            drawLine(current.x, current.y, e.clientX, e.clientY, color, 'self', true, true);
            current.x = e.clientX;
            current.y = e.clientY;
        };

        canvas.addEventListener('mousemove', onMouseMove, false);

        // Stop drawling the lines
        const onMouseUp = (e) => {
            if (!isDrawing) { return; }
            isDrawing = false;
            // move holding line with all the sub lines to main line, allowing for an undo
            drawLine(current.x, current.y, e.clientX, e.clientY, color, 'self', true,true);
            lines.push(holdingLine['self'])
            holdingLine['self'] = []
            socketRef.current.emit('lineCompleted', room);
        };

        const onMouseUpExt = (data) => {
            console.log(lines)
            lines.push(holdingLine[data.user])
            console.log(lines)
            holdingLine[data.user] = []
        };

        canvas.addEventListener('mouseup', onMouseUp, false);
        canvas.addEventListener('mouseout', onMouseUp, false);
        //canvas.addEventListener('wheel', false, false);

        // Draws on the whiteboard from incoming net messages
        const onDrawingEvent = (data) => {
            if (holdingLine[data.user] == null) {
                holdingLine[data.user] = []
            }
            const w = canvas.width;
            const h = canvas.height;
            drawLine(data.xStart * w, data.yStart * h, data.xEnd * w, data.yEnd * h, data.color, data.user, true,false);
        };

        // Clears the whiteboard
        const onClearEvent = () => {
            context.clearRect(0, 0, canvas.width, canvas.height)
            lines = []
        };

        const onUndoEvent = () => {
            context.clearRect(0, 0, canvas.width, canvas.height)
            lines.pop()
            let i;
            let j;
            for (i = 0; i < lines.length; i++) {
                for (j = 0; j < lines[i].length; j++) {
                    drawLine(lines[i][j].xStart, lines[i][j].yStart, lines[i][j].xEnd, lines[i][j].yEnd, lines[i][j].color, 'self', false, false)
                }
            }
        }

        // socket net messages
        socketRef.current = io.connect(':8080/');
        socketRef.current.on('drawing', onDrawingEvent);
        socketRef.current.on('clear', onClearEvent);
        socketRef.current.on('undo', onUndoEvent);
        socketRef.current.on('lineCompleted', onMouseUpExt);
        socketRef.current.emit('joinRoom', room);
    });

    // Clear whiteboard button
     function clearWhiteboard() {
         canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         socketRef.current.emit('clear', room);
     }

    // Undo draw button
    function undoDraw() {
        socketRef.current.emit('undo', room);
    }

     // temp room system
    function room1() {
        canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        room = "room1";
        socketRef.current.emit('joinRoom', room);
    }

    function room2() {
        canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        room = "room2";
        socketRef.current.emit('joinRoom', room);
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
                <button className="button tools" onClick={undoDraw}><i className="fa fa-undo"/></button>
                <button className="button tools" onClick={clearWhiteboard}><i className="fa fa-trash"/></button>
                <button className="button tools" onClick={room1}>1</button>
                <button className="button tools" onClick={room2}>2</button>
            </div>
        </div>
    );
};

export default Board;