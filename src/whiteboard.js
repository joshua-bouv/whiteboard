import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text } from 'react-konva';
import BoardRectangle from './Components/BoardRectangle'
import BoardCircle from './Components/BoardCircle'
import { makeStyles } from '@material-ui/core/styles';

import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import IconButton from '@material-ui/core/IconButton';
import Popover from '@material-ui/core/Popover';

import {ColorButton} from 'material-ui-color';

import CreateIcon from '@material-ui/icons/Create';
import PaletteIcon from '@material-ui/icons/Palette';
import AspectRatioIcon from '@material-ui/icons/AspectRatio';
import UndoIcon from '@material-ui/icons/Undo';
import RedoIcon from '@material-ui/icons/Redo';
import DeleteIcon from '@material-ui/icons/Delete';
import GestureIcon from '@material-ui/icons/Gesture';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import TitleIcon from '@material-ui/icons/Title';
import TouchAppIcon from '@material-ui/icons/TouchApp';

import './styles/board.css';
import io from "socket.io-client";

let current = io.connect(':8080/');
current.emit('joinRoom', "123");

const useStyles = makeStyles({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        maxWidth: 130,
        paddingLeft: 10,
        paddingRight: 5,
    },
    button: {
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 0,
        paddingRight: 0,
    },
});

const Board = () => {
    const tools = useRef({
        tool: 'line',
        stroke: '#000000',
    })

    let [incompleteObjects, setIncompleteObjects] = useState([]);
    let [completedObjects, setCompletedObjects] = useState([]);
    const holdingObjects = useRef([]);
    let historicSnapshots = useRef([]);
    let historyCount = useRef(0);
    let room = useRef("123");
    const outer = useRef(null);
    const isDrawing = useRef(false);
    const roomIDRef = useRef(null);
    const textRef = useRef(null);
    const classes = useStyles();

    let [isDragging, setIsDragging] = useState(false);
    let [isDrawingTool, setIsDrawingTool] = useState(false);

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
                value={tools.current.stroke}
                onClick={() => {
                    tools.current.stroke = strokes[key];
                }}
                className={"color "+key}
            />)
    }

    useEffect(() => {
        current.on('objectStart', handleSocketDown);
        current.on('drawing', handleSocketMove);
        current.on('objectEnd', handleSocketUp);
        current.on('streamObject', handleStreamObject);
        current.on('updateObject', handleUpdateObject);
        current.on('clearWhiteboard', clearWhiteboard);
        current.on('undoWhiteboard', undoWhiteboard);
        current.on('redoWhiteboard', redoWhiteboard);

        return () => {
            current.off();
        }
    });

    const generateIncompleteObjects = () => {
        incompleteObjects = []
        for (let key in holdingObjects.current) {
            incompleteObjects.push(holdingObjects.current[key])
        }
        setIncompleteObjects(incompleteObjects.concat())
    }

    const generateHistoryStep = () => {
        if (historyCount.current !== historicSnapshots.current.length) {
            historicSnapshots.current = historicSnapshots.current.slice(0, historyCount.current)
        }
        historyCount.current += 1
        historicSnapshots.current.push([...completedObjects.concat()])
    }

    const drawObject = (point, user) => {
        let lastObject = holdingObjects.current[user]; // gets the latest object added to whiteboard

        if (tools.current.tool === "line" || tools.current.tool === "eraser") {
            lastObject.points = lastObject.points.concat([point.x, point.y]); // adds the new plots into the points array
            generateIncompleteObjects()
        } else if (tools.current.tool === "square") { // potentially other objects
            let x = point.x - lastObject.points[0];
            let y = point.y - lastObject.points[1];
            lastObject.size = [x, y]; // update size of object
            generateIncompleteObjects()
        } else if (tools.current.tool === "circle") {
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

    const [selectedId, selectShape] = React.useState(null);

    /* For starting objects via the local user */
    const handleMouseDown = (e) => {
        if (isDragging) {
            const clickedOnEmpty = e.target === e.target.getStage();
            console.log("---")
            console.log(clickedOnEmpty)
            if (clickedOnEmpty) {
                selectShape(null);
            }
        } else if (isDrawingTool) {
            isDrawing.current = true;

            if (holdingObjects.current['self'] == null) { // untested
                holdingObjects.current['self'] = [];
            }

            const pos = e.target.getStage().getPointerPosition();

            if (tools.current.tool === "line" || tools.current.tool === "eraser") {
                holdingObjects.current['self'] = { selectID: historyCount.current, tool:tools.current.tool, points: [pos.x, pos.y], stroke:tools.current.stroke };
            } else if (tools.current.tool === "square") {
                holdingObjects.current['self'] = { selectID: historyCount.current, tool:tools.current.tool, points: [pos.x, pos.y], size: [0, 0], stroke:tools.current.stroke };
            } else if (tools.current.tool === "circle") {
                holdingObjects.current['self'] = { selectID: historyCount.current, tool:tools.current.tool, points: [pos.x, pos.y], radius: 0, stroke:tools.current.stroke };
            } else if (tools.current.tool === "text") {
                holdingObjects.current['self'] = { selectID: historyCount.current, tool:tools.current.tool, points: [pos.x, pos.y], text: "test", stroke:tools.current.stroke };
            }

            generateIncompleteObjects()

            if (tools.current.tool === "text") {
                current.emit('objectStart', {
                    point: pos,
                    tool:tools.current.tool,
                    stroke:tools.current.stroke,
                    text: "test"
                });
            } else {
                current.emit('objectStart', {
                    point: pos,
                    tool:tools.current.tool,
                    stroke:tools.current.stroke,
                });
            }
        }
    };

    /* For starting objects via an external user */
    const handleSocketDown = (data) => {
        if (holdingObjects.current[data.user] == null) { // untested
            holdingObjects.current[data.user] = [];
        }

        const pos = data.point;

        if (data.tool === "line" || data.tool === "eraser") {
            holdingObjects.current[data.user] = { selectID: historyCount.current, tool:data.tool, points: [pos.x, pos.y], stroke:data.stroke };
        } else if (data.tool === "square") {
            holdingObjects.current[data.user] = { selectID: historyCount.current, tool:data.tool, points: [pos.x, pos.y], size: [0, 0], stroke:data.stroke };
        } else if (data.tool === "circle") {
            holdingObjects.current[data.user] = { selectID: historyCount.current, tool:data.tool, points: [pos.x, pos.y], radius: 0, stroke:data.stroke };
        } else if (data.tool === "text") {
            holdingObjects.current[data.user] = { selectID: historyCount.current, tool:data.tool, points: [pos.x, pos.y], text:data.text, stroke:data.stroke };
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
        if (isDrawingTool) {
            isDrawing.current = false;
            let completedObject = holdingObjects.current['self'];
            completedObjects.push(completedObject)
            setCompletedObjects([...completedObjects.concat()])
            current.emit('objectEnd', {room:room.current, object: completedObject});
            holdingObjects.current['self'] = [];
        }
        generateIncompleteObjects()
        generateHistoryStep() // probs needs moving
    };

    /* For ending objects via an external user */
    const handleSocketUp = (user) => {
        completedObjects.push(holdingObjects.current[user])
        setCompletedObjects([...completedObjects.concat()])
        holdingObjects.current[user] = [];
        generateIncompleteObjects()
        generateHistoryStep()
    };

    /* For streaming objects from the database */
    const handleStreamObject = (data) => {
//        data.selectID = data._id
        completedObjects.push({...data})
        setTimeout(function(){ setCompletedObjects([...completedObjects.concat()]); }, 10);
        generateHistoryStep()
    }

    /* For streaming objects from the database */
    const handleUpdateObject = (data) => {
        completedObjects.map((testobj, i) => {
            if (testobj._id === data._id) {
                if (data.tool === "square") {
                    completedObjects[i].points[0] = data.points[0]
                    completedObjects[i].points[1] = data.points[1]
                    completedObjects[i].size[0] = data.size[0]
                    completedObjects[i].size[1] = data.size[1]
                } else if (data.tool === "circle") {
                    completedObjects[i].points[0] = data.points[0]
                    completedObjects[i].points[1] = data.points[1]
                    completedObjects[i].radius = data.radius
                }
            }
        });
        setCompletedObjects([...completedObjects.concat()]);
        generateHistoryStep()
    }

    const clearWhiteboard = () => {
        incompleteObjects = []
        completedObjects = []
        setIncompleteObjects([])
        setCompletedObjects([])
        //outer.current.getStage().clear();
    }

    const undoWhiteboard = () => {
        if (historyCount.current > 1) {
            historyCount.current -= 1
            setCompletedObjects([...historicSnapshots.current[(historyCount.current) - 1]])
        }
    }

    const redoWhiteboard = () => {
        console.log(historyCount.current)
        console.log(...[historicSnapshots.current])
        if (historyCount.current <= historicSnapshots.current.length - 1) {
            setCompletedObjects([...historicSnapshots.current[historyCount.current]])
            historyCount.current += 1
        }
    }

    const handleClear = () => {
        clearWhiteboard()
        current.emit('clearWhiteboard', room.current);
    }

    const handleUndo = () => {
        undoWhiteboard()
        current.emit('undoWhiteboard', room.current);
    }

    const handleRedo = () => {
        redoWhiteboard()
        let latestLine = historicSnapshots.current[historyCount.current-1]
        current.emit('redoWhiteboard', {room:room.current, object: latestLine[latestLine.length-1]});
    }

    const handleJoin = () => {
        clearWhiteboard()
        room = roomIDRef.current.value
        current.emit('joinRoom', room);
    }

    const handleMoveObjects = () => {
        isDragging = setIsDragging(true);
        isDrawingTool = setIsDrawingTool(false);
        setAnchorEl(null);
    }

    const handleStartDrawing = () => {
        isDragging = setIsDragging(false);
        isDrawingTool = setIsDrawingTool(true);
        setAnchorEl(null);
    }

    var scaleBy = 0.95;
    const handleMouseWheel = (e) => {
        let stage = e.target.getStage()
        let oldScale = stage.scaleX()
        let pointer = stage.getPointerPosition()
        let mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };
        let newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        stage.scale({ x: newScale, y: newScale });
        let newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        stage.position(newPos);
        stage.batchDraw();
    }

    const [anchorEl, setAnchorEl] = React.useState(null);
    const [anchorEl2, setAnchorEl2] = React.useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };


    const handleClick2 = (event) => {
        setAnchorEl2(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleClose2 = () => {
        setAnchorEl2(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;

    const open2 = Boolean(anchorEl2);
    const id2 = open2 ? 'simple-popover' : undefined;

    return (
        <div>
            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                draggable={false}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onWheel={handleMouseWheel}
            >
                <Layer
                    ref={outer}
                    listening={true}
                >
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
                                    <BoardRectangle
                                        key={i}
                                        shapeProps={object}
                                        isSelected={object.selectID === selectedId}
                                        onSelect={() => {
                                            selectShape(object.selectID);
                                        }}
                                        onChange={(newAttrs) => {
                                            completedObjects.map((testobj, i) => {
                                                if (testobj.selectID === newAttrs.key) { // fix this mess + make tools refresh and pass if is in use
                                                    completedObjects[i].points[0] = newAttrs.x
                                                    completedObjects[i].points[1] = newAttrs.y
                                                    completedObjects[i].size[0] = newAttrs.width
                                                    completedObjects[i].size[1] = newAttrs.height
                                                    current.emit('updateObject', completedObjects[i]);
                                                }
                                            });
                                            setCompletedObjects([...completedObjects.concat()])
                                        }}
                                        onCanMove={isDragging}
                                    />
                                )
                            } else if (object.tool === "circle") {
                                return (
                                    <BoardCircle
                                        key={i}
                                        shapeProps={object}
                                        isSelected={object.selectID === selectedId}
                                        onSelect={() => {
                                            selectShape(object.selectID);
                                        }}
                                        onChange={(newAttrs) => {
                                            completedObjects.map((testobj, i) => {
                                                if (testobj.selectID === newAttrs.key) { // fix this mess + make tools refresh and pass if is in use
                                                    completedObjects[i].points[0] = newAttrs.x
                                                    completedObjects[i].points[1] = newAttrs.y
                                                    completedObjects[i].radius = newAttrs.radius
                                                    current.emit('updateObject', completedObjects[i]);
                                                }
                                            });
                                            setCompletedObjects([...completedObjects.concat()])
                                        }}
                                        onCanMove={isDragging}
                                    />
                                )
                            } else if (object.tool === "text") {
                                return (
                                    <Text
                                        key={i}
                                        x={object.points[0]}
                                        y={object.points[1]}
                                        text={object.text}
                                        fill={object.stroke}
                                        fontFamily={'Calibri'}
                                        fontSize={18}
                                    />
                                )
                            }
                        })
                    }
                    {console.log(completedObjects)}
                    {
                        incompleteObjects.map((object, i) => {
                            if (object.tool === "line" || object.tool === "eraser") {
                                console.log("bruh")
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
            <Container className={classes.root} maxWidth="sm">
                <Popover
                    id={id}
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorReference="anchorPosition"
                    anchorPosition={{ top: 0, left: 70 }}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "line"}}>
                        <GestureIcon />
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "square"}}>
                        <CheckBoxOutlineBlankIcon />
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "circle"}}>
                        <RadioButtonUncheckedIcon />
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "eraser"}}>
                        <TouchAppIcon />
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "text"}}>
                        <TitleIcon />
                    </IconButton>
                </Popover>
                <Popover
                    id={id2}
                    open={open2}
                    anchorEl={anchorEl2}
                    onClose={handleClose2}
                    anchorReference="anchorPosition"
                    anchorPosition={{ top: 60, left: 70 }}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "black"}}>
                        <ColorButton color={strokes['black']}/>
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "red"}}>
                        <ColorButton color={strokes['red']}/>
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "green"}}>
                        <ColorButton color={strokes['green']}/>
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "blue"}}>
                        <ColorButton color={strokes['blue']}/>
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "purple"}}>
                        <ColorButton color={strokes['purple']}/>
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "grey"}}>
                        <ColorButton color={strokes['grey']}/>
                    </IconButton>
                    <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2();tools.current.stroke = "yellow"}}>
                        <ColorButton color={strokes['yellow']}/>
                    </IconButton>
                </Popover>
                <List component="nav">
                    <ListItem className={classes.button}>
                        <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={handleClick}>
                            <CreateIcon />
                        </IconButton>
                    </ListItem>
                    <ListItem className={classes.button}>
                        <IconButton aria-label="Colours" aria-controls="simple-menu" aria-haspopup="true" onClick={handleClick2}>
                            <PaletteIcon />
                        </IconButton>
                    </ListItem>
                    <ListItem className={classes.button}>
                        <IconButton aria-label="Manipulate" onClick={handleMoveObjects}>
                            <AspectRatioIcon />
                        </IconButton>
                    </ListItem>
                    <ListItem className={classes.button}>
                        <IconButton aria-label="Undo" onClick={handleUndo}>
                            <UndoIcon />
                        </IconButton>
                    </ListItem>
                    <ListItem className={classes.button}>
                        <IconButton aria-label="Redo" onClick={handleRedo}>
                            <RedoIcon />
                        </IconButton>
                    </ListItem>
                    <ListItem className={classes.button}>
                        <IconButton aria-label="Clear" onClick={handleClear}>
                            <DeleteIcon />
                        </IconButton>
                    </ListItem>
                </List>
            </Container>
        </div>
    );
};

export default Board
/*
<select
className="select"
value={tools.current.tool}
onChange={(e) => {
    tools.current.tool = e.target.value;
}}
>
<option value="line">Line</option>
<option value="eraser">Eraser</option>
<option value="square">Square</option>
<option value="circle">Circle</option>
<option value="text">Text</option>
</select>
<div className="colors">
{strokeButtons}
</div>
<div className="buttons">
<textarea ref={textRef} defaultValue='example text'/>
<button className="button tools" onClick={handleClear}><FontAwesomeIcon icon={faTrash} /></button>
<textarea ref={roomIDRef} defaultValue={room.current}/>
<button className="button toolsL" onClick={handleJoin}>Join room</button>
<button className="button tools" onClick={handleUndo}><FontAwesomeIcon icon={faUndo} /></button>
<button className="button tools" onClick={handleRedo}><FontAwesomeIcon icon={faRedo} /></button>
<button className="button tools" onClick={handleStartDrawing}><FontAwesomeIcon icon={faPen} /></button>
<button className="button tools" onClick={handleMoveObjects}><FontAwesomeIcon icon={faArrowsAlt} /></button>
<button className="button tools" onClick={handleResizeObjects}><FontAwesomeIcon icon={faExpand} /></button>
</div>
*/