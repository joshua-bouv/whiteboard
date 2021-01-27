import React, { setState, useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import './styles/board.css';
import io from "socket.io-client";

let current = io.connect(':8080/');
current.emit('joinRoom', "123");

const Board = () => {
    const [tool, setTool] = useState('line');
    const [stroke, setStroke] = useState('#000000');
    let [objects, setObject] = useState([]);
    let [socketObjects, setSocketObject] = useState([]);
    const [holdingObjects] = useState([]);
    let [room, joinRoom] = useState("123");
    const outer = useRef(null);
    const isDrawing = useRef(false);
    const roomIDRef = useRef(null);
    const strokeButtons = [];
    const strokes = {
        'black': '#000000',
        'red': '#e74c3c',
        'green': '#27ae60',
        'blue': '#2980b9',
        'purple': '#9b59b6',
        'grey': '#95a5a6',
        'yellow': '#f1c40f',
    };

    useEffect(() => {
        current.on('objectStart', handleSocketDown);
        current.on('drawing', handleSocketMove);
        current.on('objectEnd', handleSocketUp);

        current.on('streamLine', handleStreamLine);
        current.on('clearWhiteboard', handleSocketClear);

        return () => {
            current.off();
        }
    });

    for (const key in strokes) { // to generate the pre-defined colors
        strokeButtons.push(
            <div
                key={key}
                value={stroke}
                onClick={() => {
                    setStroke(strokes[key]);
                }}
                className={"color "+key}
            />)
    }

    const handleMouseDown = (e) => {
        isDrawing.current = true;

        const pos = e.target.getStage().getPointerPosition();

        if (tool === "line" || tool === "eraser") {
            setObject([...objects, { tool, points: [pos.x, pos.y], stroke }]);
        } else if (tool === "square") { // potentially other objects
            setObject([...objects, { tool, points: [pos.x, pos.y], size: [0, 0], stroke }]);
        } else if (tool === "circle") {
            setObject([...objects, { tool, points: [pos.x, pos.y], radius: 0, stroke }]);
        }

        current.emit('objectStart', {
            point: pos,
            tool,
            stroke
        });
    };

    const drawObject = (point, socket, user) => {
        let lastObject;
        if (socket) {
            lastObject = holdingObjects[user]; // gets the latest object added to whiteboard
        } else {
            lastObject = objects[objects.length - 1]; // gets the latest object added to whiteboard
        }

        if (tool === "line" || tool === "eraser") {
            lastObject.points = lastObject.points.concat([point.x, point.y]); // adds the new plots into the points array
            objects.splice(objects.length - 1, 1, lastObject); // deletes the old object
            setObject(objects.concat()); // adds the new updated object
        } else if (tool === "square") { // potentially other objects
            let x = point.x - lastObject.points[0];
            let y = point.y - lastObject.points[1];
            lastObject.size = [x, y]; // update size of object
            objects.splice(objects.length - 1, 1, lastObject); // deletes the old object
            setObject(objects.concat()); // adds the new updated object
        } else if (tool === "circle") {
            let radius;
            let x = point.x - lastObject.points[0];
            let y = point.y - lastObject.points[1];

            if (x >= y) {
                radius = x;
            } else {
                radius = y;
            }

            if (radius >= 0) { // update radius of object
                lastObject.radius = radius;
            } else {
                lastObject.radius = -radius;
            }

            objects.splice(objects.length - 1, 1, lastObject); // deletes the old object
            setObject(objects.concat()); // adds the new updated object
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing.current) { return; }

        const point = e.target.getStage().getPointerPosition();
        drawObject(point);

        current.emit('drawing', {
            point,
        });
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
        let completedObject = objects[objects.length - 1];

        current.emit('objectEnd', {room, object: completedObject});
    };

    const handleSocketDown = (data) => {
        if (holdingObjects[data.user] == null) { // untested
            holdingObjects[data.user] = [];
        }

        const pos = data.point;

        if (data.tool === "line" || data.tool === "eraser") {
            holdingObjects[data.user] = { tool, points: [pos.x, pos.y], stroke };
        } else if (tool === "square") { // potentially other objects
            holdingObjects[data.user] = { tool, points: [pos.x, pos.y], size: [0, 0], stroke };
        } else if (tool === "circle") {
            holdingObjects[data.user] = { tool, points: [pos.x, pos.y], radius: 0, stroke };
        }
    };

    const handleSocketMove = (data) => {
        drawObject(data.point, true, data.user);
    };

    const handleSocketUp = (data) => {
        socketObjects.push(holdingObjects[data.user])

        console.log(socketObjects)
    };

    const handleStreamLine = (data) => {
        setSocketObject([...socketObjects, data]);
    }

    const clearWhiteboard = () => {
        objects = []
        socketObjects = []
        setObject([])
        setSocketObject([])
        outer.current.getStage().clear();
    }

    const handleSocketClear = () => {
        clearWhiteboard()
    }

    const handleClear = () => {
        clearWhiteboard()
        current.emit('clearWhiteboard', room);
    }

    const handleJoin = () => {
        clearWhiteboard()
        room = roomIDRef.current.value
        current.emit('joinRoom', room);
    }

    return (
        <div>
            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
            >
                <Layer
                    ref={outer}
                    listening={false}
                >
                    {
                        objects.map((object, i) => {
                            if (object.tool === "line" || object.tool === "eraser") {
                                return (
                                    <Line
                                        key={i}
                                        points={object.points}
                                        stroke={object.stroke}
                                        strokeWidth={5}
                                        tension={0.5}
                                        lineCap="round"
                                        globalCompositeOperation={
                                            object.tool === 'eraser' ? 'destination-out' : 'source-over'
                                        }
                                        draggable={false}
                                        listening={false}
                                    />
                                )
                            } else if (object.tool === "square") {
                                return (
                                    <Rect
                                        key={i}
                                        x={object.points[0]}
                                        y={object.points[1]}
                                        width={object.size[0]}
                                        height={object.size[1]}
                                        fill={object.stroke}
                                        draggable={false}
                                        listening={false}
                                    />
                                )
                            } else if (object.tool === "circle") {
                                return (
                                    <Circle
                                        key={i}
                                        x={object.points[0]}
                                        y={object.points[1]}
                                        radius={object.radius}
                                        fill={object.stroke}
                                        draggable={false}
                                        listening={false}
                                    />
                                )
                            }
                        })
                    }
                    {
                        socketObjects.map((object, i) => {
                            if (object.tool === "line" || object.tool === "eraser") {
                                return (
                                    <Line
                                        key={i}
                                        points={object.points}
                                        stroke={object.stroke}
                                        strokeWidth={5}
                                        tension={0.5}
                                        lineCap="round"
                                        globalCompositeOperation={
                                            object.tool === 'eraser' ? 'destination-out' : 'source-over'
                                        }
                                        draggable={false}
                                        listening={false}
                                    />
                                )
                            } else if (object.tool === "square") {
                                return (
                                    <Rect
                                        key={i}
                                        x={object.points[0]}
                                        y={object.points[1]}
                                        width={object.size[0]}
                                        height={object.size[1]}
                                        fill={object.stroke}
                                        draggable={false}
                                        listening={false}
                                    />
                                )
                            } else if (object.tool === "circle") {
                                return (
                                    <Circle
                                        key={i}
                                        x={object.points[0]}
                                        y={object.points[1]}
                                        radius={object.radius}
                                        fill={object.stroke}
                                        draggable={false}
                                        listening={false}
                                    />
                                )
                            }
                        })
                    }
                </Layer>
            </Stage>
            <select
                className="select"
                value={tool}
                onChange={(e) => {
                    setTool(e.target.value);
                }}
            >
                <option value="line">Line</option>
                <option value="eraser">Eraser</option>
                <option value="square">Square</option>
                <option value="circle">Circle</option>
            </select>
            <div className="colors">
                {strokeButtons}
            </div>
            <div className="buttons">
                <textarea defaultValue='example text'/>
                <button className="button tools" onClick={handleClear}><FontAwesomeIcon icon={faTrash} /></button>
                <textarea ref={roomIDRef} defaultValue={room}/>
                <button className="button toolsL" onClick={handleJoin}>Join room</button>
            </div>
        </div>
    );
};

export default Board