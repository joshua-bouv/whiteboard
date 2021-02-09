import React, { setState, useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { faUndo } from '@fortawesome/free-solid-svg-icons'
import { faRedo } from '@fortawesome/free-solid-svg-icons'
import { faArrowsAlt } from '@fortawesome/free-solid-svg-icons'
import './styles/board.css';
import io from "socket.io-client";

let current = io.connect(':8080/');
current.emit('joinRoom', "123");

const Board = () => {
    const [tool, setTool] = useState('line');
    const [stroke, setStroke] = useState('#000000');
    const [isDragging, setDragging] = useState(false);
    let [incompleteObjects, setIncompleteObjects] = useState([]);
    let [completedObjects, setCompletedObjects] = useState([]);
    const [holdingObjects, setHoldingObjects] = useState([]);
    let [historicSnapshots, setHistoricSnapshots] = useState([]);
    let [room, joinRoom] = useState("123");
    const outer = useRef(null);
    const isDrawing = useRef(false);
    const roomIDRef = useRef(null);
    let [historyCount, setHistoryCount] = useState(0);

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

    useEffect(() => {
        current.on('objectStart', handleSocketDown);
        current.on('drawing', handleSocketMove);
        current.on('objectEnd', handleSocketUp);
        current.on('streamLine', handleStreamLine);
        current.on('clearWhiteboard', clearWhiteboard);
        current.on('undoWhiteboard', undoWhiteboard);
        current.on('redoWhiteboard', redoWhiteboard);

        return () => {
            current.off();
        }
    });

    const generateIncompleteObjects = () => {
        incompleteObjects = []
        for (let key in holdingObjects) {
            incompleteObjects.push(holdingObjects[key])
        }
        setIncompleteObjects(incompleteObjects.concat())
    }

    const generateHistoryStep = () => {
        if (historyCount !== historicSnapshots.length) {
            console.log("new timeline")
//      historicSnapshots = historicSnapshots.slice(0, historyCount)
        }
        console.log("GEN HIS STEP:")
        console.log(historicSnapshots)
        console.log(historyCount)

        setHistoryCount(historyCount + 1)
        historicSnapshots.push([...completedObjects.concat()])
        setHistoricSnapshots(historicSnapshots)
    }

    const drawObject = (point, user) => {
        let lastObject = holdingObjects[user]; // gets the latest object added to whiteboard

        if (tool === "line" || tool === "eraser") {
            lastObject.points = lastObject.points.concat([point.x, point.y]); // adds the new plots into the points array
            generateIncompleteObjects()
        } else if (tool === "square") { // potentially other objects
            let x = point.x - lastObject.points[0];
            let y = point.y - lastObject.points[1];
            lastObject.size = [x, y]; // update size of object
            generateIncompleteObjects()
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
            generateIncompleteObjects()
        }
    };

    /* For starting objects via the local user */
    const handleMouseDown = (e) => {
        isDrawing.current = true;

        if (holdingObjects['self'] == null) { // untested
            holdingObjects['self'] = [];
        }

        const pos = e.target.getStage().getPointerPosition();

        if (tool === "line" || tool === "eraser") {
            holdingObjects['self'] = { tool, points: [pos.x, pos.y], stroke };
        } else if (tool === "square") { // potentially other objects
            holdingObjects['self'] = { tool, points: [pos.x, pos.y], size: [0, 0], stroke };
        } else if (tool === "circle") {
            holdingObjects['self'] = { tool, points: [pos.x, pos.y], radius: 0, stroke };
        }

        current.emit('objectStart', {
            point: pos,
            tool,
            stroke
        });
    };

    /* For starting objects via an external user */
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

    /* For drawing objects via the local user */
    const handleMouseMove = (e) => {
        if (!isDrawing.current) { return; }

        const point = e.target.getStage().getPointerPosition();
        drawObject(point, 'self');

        current.emit('drawing', {
            point,
        });
    };

    /* For drawing objects via an external user */
    const handleSocketMove = (data) => {
        drawObject(data.point, data.user);
    };

    /* For ending objects via the local user */
    const handleMouseUp = () => {
        isDrawing.current = false;
        let completedObject = holdingObjects['self'];
        completedObjects.push(completedObject)
        setCompletedObjects(completedObjects.concat())
        current.emit('objectEnd', {room, object: completedObject});
        holdingObjects['self'] = [];
        generateIncompleteObjects()
        generateHistoryStep()
    };

    /* For ending objects via an external user */
    const handleSocketUp = (user) => {
        completedObjects.push(holdingObjects[user])
        setCompletedObjects(completedObjects.concat())
        holdingObjects[user] = [];
        generateIncompleteObjects()
        generateHistoryStep()
    };

    /* For streaming objects from the database */
    const handleStreamLine = (data) => {
        completedObjects.push(data)
        setCompletedObjects(completedObjects.concat());
        generateHistoryStep()
    }

    const clearWhiteboard = () => {
        incompleteObjects = []
        completedObjects = []
        setIncompleteObjects([])
        setCompletedObjects([])
        outer.current.getStage().clear();
    }

    const undoWhiteboard = () => {
        console.log("UNDO:")
        console.log(historyCount)
        console.log(historicSnapshots)
        if (historyCount > 1) {
            setHistoryCount(historyCount - 1)
            setCompletedObjects(historicSnapshots[(historyCount - 1) - 1])
        }
    }

    const redoWhiteboard = () => {
        console.log("REDO:")
        console.log(historyCount)
        console.log(historicSnapshots.length - 1)
        console.log(historicSnapshots)
        if (historyCount <= historicSnapshots.length - 1) {
            setHistoryCount(historyCount + 1)
            console.log(historyCount)
            setCompletedObjects(historicSnapshots[historyCount])
        }
    }

    const handleClear = () => {
        clearWhiteboard()
        current.emit('clearWhiteboard', room);
    }

    const handleUndo = () => {
        undoWhiteboard()
        current.emit('undoWhiteboard', room);
    }

    const handleRedo = () => {
        redoWhiteboard()
        current.emit('redoWhiteboard', room);
    }

    const handleJoin = () => {
        clearWhiteboard()
        room = roomIDRef.current.value
        current.emit('joinRoom', room);
    }

    const handleMoveObjects = () => {
        if (isDragging) {
            setDragging(false)
        } else {
            setDragging(true)
        }
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
                    listening={isDragging}
                >
                    {
                        incompleteObjects.map((object, i) => {
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
                        completedObjects.map((object, i) => {
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
                                        draggable={isDragging}
                                        listening={isDragging}
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
                                        draggable={isDragging}
                                        listening={isDragging}
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
                                        draggable={isDragging}
                                        listening={isDragging}
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
                <button className="button tools" onClick={handleUndo}><FontAwesomeIcon icon={faUndo} /></button>
                <button className="button tools" onClick={handleRedo}><FontAwesomeIcon icon={faRedo} /></button>
                <button className="button tools" onClick={handleMoveObjects}><FontAwesomeIcon icon={faArrowsAlt} /></button>
            </div>
        </div>
    );
};

export default Board