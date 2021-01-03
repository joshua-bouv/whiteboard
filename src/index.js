import React, { useState, useRef } from 'react';
import { render } from 'react-dom';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import './styles/board.css';

const App = () => {
    const [tool, setTool] = useState('line');
    const [stroke, setStroke] = useState('#000000');
    const [objects, setObject] = useState([]);
    const isDrawing = useRef(false);
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
        strokeButtons.push(<div
            key={key}
            value={stroke}
            onClick={() => {
                setStroke(strokes[key]);
            }}
            className={"color "+key} />)
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
    };

    const handleMouseMove = (e) => {
        if (!isDrawing.current) { return; }

        const point = e.target.getStage().getPointerPosition();
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
                if (x >= 0) {
                    radius = x;
                } else {
                    radius = -x;
                }
            } else {
                if (y >= 0) {
                    radius = y;
                } else {
                    radius = -y;
                }
            }

            lastObject.radius = radius; // update radius of object
            objects.splice(objects.length - 1, 1, lastObject); // deletes the old object
            setObject(objects.concat()); // adds the new updated object
        }
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
    };

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
                    {objects.map((object, i) => {
                        if (object.tool === "line" || object.tool === "eraser") {
                            return (
                                <Line
                                    key={i}
                                    points={object.points}
                                    stroke={object.stroke}
                                    strokeWidth={5}
                                    tension={0.5}
                                    draggable={false}
                                    lineCap="round"
                                    globalCompositeOperation={
                                        object.tool === 'eraser' ? 'destination-out' : 'source-over'
                                    }
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
                                    draggable={false}
                                    fill={object.stroke}
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
                                />
                            )
                        }
                    })}
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