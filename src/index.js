import React, { useState, useRef } from 'react';
import { render } from 'react-dom';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import './styles/board.css';
import io from "socket.io-client";

const App = () => {
    const [tool, setTool] = useState('line');
    const [stroke, setStroke] = useState('#000000');
    const [objects, setObject] = useState([]);
    const [socketObjects, setSocketObject] = useState([]);
    const isDrawing = useRef(false);
    const socketRef = useRef();
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

        socketRef.current.emit('objectStart', {
            point: pos,
            tool,
            stroke
        });
    };

    const drawObject = (point, socket, data) => {
        let lastObject = objects[objects.length - 1]; // gets the latest object added to whiteboard

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

        /*
        socketRef.current.emit('drawing', {
            point,
        });
        */
    };

    const handleSocketMove = (data) => {
        drawObject(data.point, true, data);
    };

    const handleSocketDown = (data) => {
        console.log("ermmmmm")
        if (socketObjects[data.user] == null) { // untested
            socketObjects[data.user] = socketObjects;
            setSocketObject[data.user] = setSocketObject;
        }

        const pos = data.point;

        if (data.tool === "line" || data.tool === "eraser") {
            setSocketObject[data.user]([...socketObjects[data.user], { tool, points: [pos.x, pos.y], stroke }]);
        } else if (tool === "square") { // potentially other objects
            setSocketObject[data.user]([...socketObjects[data.user], { tool, points: [pos.x, pos.y], size: [0, 0], stroke }]);
        } else if (tool === "circle") {
            setSocketObject[data.user]([...socketObjects[data.user], { tool, points: [pos.x, pos.y], radius: 0, stroke }]);
        }
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
    };

    socketRef.current = io.connect(':8080/');
    socketRef.current.on('objectStart', handleSocketDown);
//    socketRef.current.on('drawing', handleSocketMove);
    socketRef.current.emit('joinRoom', "123");

    //const [socketObjects, setSocketObject] = useState([]);

    const canvasDrawObject = (object, i) => {

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
                <Layer>
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
                                    />
                                )
                            }
                        })
                    }
                    {
/*                        socketObjectsHolding.map((object, i) => {
                            // go through each table for each socket
                            canvasDrawObject(object, i)
                        })
*/
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
        </div>
    );
};

render(<App />, document.getElementById('root'));