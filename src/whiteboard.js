import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Group } from 'react-konva';

import BoardRectangle from './Components/BoardRectangle'
import BoardCircle from './Components/BoardCircle'
import { makeStyles } from '@material-ui/core/styles';

import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
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
import { useSnackbar } from 'notistack';

import SidebarItem from './UI/SidebarItem'

import './styles/board.css';
import io from "socket.io-client";
import SideBarSubItem from "./UI/SideBarSubItem";
import LoginButton from "./UI/Login";
import UserActions from "./UI/UserActions";
import JoinButton from "./UI/JoinWhiteboard";
import BoardText from "./Components/BoardText";
import {SvgIcon, Tooltip} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import ViewersList from "./UI/ViewersList";

let current = io.connect(':8080/');
let sessionWhiteboardID = sessionStorage.getItem('whiteboardID')
let urlWhiteboardID = window.location.pathname.substring(1)
if (urlWhiteboardID !== "") {
    console.log("Joining whiteboard from URL")
    current.emit('joinWhiteboard', {whiteboardID: urlWhiteboardID, username: localStorage.getItem('username')})
} else if (sessionWhiteboardID) {
    console.log("Joining whiteboard from session")
    current.emit('joinWhiteboard', {whiteboardID: sessionWhiteboardID, username: localStorage.getItem('username')})
} else {
    console.log("Making new whiteboard")
    current.emit('requestNewWhiteboard', {uniqueID: localStorage.getItem('uniqueID'), username: localStorage.getItem('username')})
}

const useStyles = makeStyles((theme) => ({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 63,
        paddingLeft: 10,
        paddingRight: 5,
    },
    login: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 'auto',
        paddingLeft: 0,
        paddingRight: 0,
    },
    viewers: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 'auto',
        paddingLeft: 0,
        paddingRight: 0,
    },
    button: {
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 0,
        paddingRight: 0,
    },
    adminButton: {
        marginRight: 10,
    },
}));

const Board = () => {
    const tools = useRef({
        tool: 'line',
        stroke: '#000000',
    })

    let [incompleteObjects, setIncompleteObjects] = useState([]);
    let [completedObjects, setCompletedObjects] = useState([]);
    const [value, setValue] = useState(0); // for forcing refreshes
    let holdingObjects = useRef([]);
    let historicSnapshots = useRef([]);
    let historyCount = useRef(0);
    let whiteboardID = useRef("");
    let [viewersList, setViewersList] = useState([]);
    const outer = useRef(null);
    const group = useRef(null)
    const group2 = useRef(null)
    const isDrawing = useRef(false);
    const loadWhiteboardsUI = useRef(null);
    const classes = useStyles();
    const { enqueueSnackbar } = useSnackbar();

    let [isDragging, setIsDragging] = useState(false);
    let [isDrawingTool, setIsDrawingTool] = useState(false);

    const strokes = {
        'black': '#000000',
        'red': '#e74c3c',
        'green': '#27ae60',
        'blue': '#2980b9',
        'purple': '#9b59b6',
        'grey': '#95a5a6',
        'yellow': '#f1c40f',
    };

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

    useEffect(() => {
        current.on('objectStart', handleSocketDown);
        current.on('drawing', handleSocketMove);
        current.on('objectEnd', handleSocketUp);
        current.on('streamObject', handleStreamObject);
        current.on('updateObject', handleUpdateObject);
        current.on('clearWhiteboard', clearWhiteboard);
        current.on('undoWhiteboard', undoWhiteboard);
        current.on('redoWhiteboard', redoWhiteboard);
        current.on('loggedIn', loggedIn);
        current.on('setupWhiteboard', setupWhiteboard);
        current.on('displayNotification', displayNotification);
        current.on('loadWhiteboards', loadWhiteboards);
        current.on('viewersChanged', viewersChanged);

        return () => {
            current.off();
        }
    });

    const viewersChanged = (data) => {
        setViewersList(data)
    }

    const loadWhiteboards = (data) => {
        loadWhiteboardsUI.current.updateSavedWhiteboards(data)
    }

    const displayNotification = (text) => {
        enqueueSnackbar(text);
    }

    const setupWhiteboard = (data) => {
        whiteboardID.current = data.whiteboardID
        sessionStorage.setItem('whiteboardID', data.whiteboardID)
        window.history.replaceState(null, "New Page Title", "/"+whiteboardID.current)
        setViewersList(data.viewers)
    }

    const makeNewWhiteboard = () => {
        clearWhiteboard()
        current.emit('requestNewWhiteboard', {uniqueID: localStorage.getItem('uniqueID'), username: localStorage.getItem('username')})
    }

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
        let lastObject = holdingObjects.current[user];
        let inUseTool = lastObject.tool;

        if (inUseTool === "line" || inUseTool === "eraser") {
            lastObject.points = lastObject.points.concat([point.x, point.y]); // adds the new plots into the points array
        } else if (inUseTool === "square") { // potentially other objects
            let x = point.x - lastObject.points[0];
            let y = point.y - lastObject.points[1];
            lastObject.size = [x, y]; // update size of object
        } else if (inUseTool === "circle") {
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
        }

        if (tools.current.tool !== "text") {
            generateIncompleteObjects();
        }
    };

    const [selectedId, selectShape] = React.useState(null);

    /* For starting objects via the local user */
    const handleMouseDown = (e) => {
        if (isDragging) {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
                selectShape(null);
            }
        } else if (isDrawingTool) {
            isDrawing.current = true;

            if (holdingObjects.current['self'] == null) { // untested
                holdingObjects.current['self'] = [];
            }

            const pos = e.target.getStage().getPointerPosition();

            let objectID = makeID(9);
            if (tools.current.tool === "line" || tools.current.tool === "eraser") {
                holdingObjects.current['self'] = { selectID: objectID, tool: tools.current.tool, points: [pos.x, pos.y], stroke: tools.current.stroke };
            } else if (tools.current.tool === "square") {
                holdingObjects.current['self'] = { selectID: objectID, tool: tools.current.tool, points: [pos.x, pos.y], size: [0, 0], stroke: tools.current.stroke };
            } else if (tools.current.tool === "circle") {
                holdingObjects.current['self'] = { selectID: objectID, tool: tools.current.tool, points: [pos.x, pos.y], radius: 0, stroke: tools.current.stroke };
            } else if (tools.current.tool === "text") {
                holdingObjects.current['self'] = { selectID: objectID, tool: tools.current.tool, points: [pos.x, pos.y], text: "Double click on me to change text", stroke: tools.current.stroke };
            }

            generateIncompleteObjects()

            if (tools.current.tool === "text") {
                current.emit('objectStart', {
                    point: pos,
                    tool: tools.current.tool,
                    stroke: tools.current.stroke,
                    text: "Double click on me to change text",
                    whiteboardID: whiteboardID.current,
                    selectID: objectID
                });
            } else {
                current.emit('objectStart', {
                    point: pos,
                    tool: tools.current.tool,
                    stroke: tools.current.stroke,
                    whiteboardID: whiteboardID.current,
                    selectID: objectID
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
            holdingObjects.current[data.user] = { selectID: data.selectID, tool: data.tool, points: [pos.x, pos.y], stroke: data.stroke };
        } else if (data.tool === "square") {
            holdingObjects.current[data.user] = { selectID: data.selectID, tool: data.tool, points: [pos.x, pos.y], size: [0, 0], stroke: data.stroke };
        } else if (data.tool === "circle") {
            holdingObjects.current[data.user] = { selectID: data.selectID, tool: data.tool, points: [pos.x, pos.y], radius: 0, stroke: data.stroke };
        } else if (data.tool === "text") {
            holdingObjects.current[data.user] = { selectID: data.selectID, tool: data.tool, points: [pos.x, pos.y], text: data.text, stroke: data.stroke };
        }
    };

    /* For drawing objects via the local user */
    const handleMouseMove = (e) => {
        if (!isDrawing.current) { return; }

        const point = e.target.getStage().getPointerPosition();
        drawObject(point, 'self');

        current.emit('drawing', {
            point,
            whiteboardID: whiteboardID.current
        });
    };

    /* For drawing objects via an external user */
    const handleSocketMove = (data) => {
        drawObject(data.point, data.user);
    };

    /* For ending objects via the local user */
    const handleMouseUp = (e) => {
        if (isDrawingTool) {
            isDrawing.current = false;
            let completedObject = holdingObjects.current['self'];
            console.log(completedObject)
            if (completedObject !== []) {
                completedObjects.push(completedObject)
                setCompletedObjects([...completedObjects.concat()])
                let stage = e.target.getStage()
                current.emit('objectEnd', {whiteboardID:whiteboardID.current, object: completedObject, image: stage.toDataURL({pixelRatio: 0.1})});
                holdingObjects.current['self'] = [];
            }
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
            if (testobj.selectID === data.selectID) {
                if (data.tool === "square") {
                    console.log({...completedObjects[i]})
                    console.log(data)
                    completedObjects[i].points[0] = data.points[0]
                    completedObjects[i].points[1] = data.points[1]
                    completedObjects[i].size[0] = data.size[0]
                    completedObjects[i].size[1] = data.size[1]
                } else if (data.tool === "circle") {
                    completedObjects[i].points[0] = data.points[0]
                    completedObjects[i].points[1] = data.points[1]
                    completedObjects[i].radius = data.radius
                } else if (data.tool === "text") {
                    completedObjects[i].points[0] = data.points[0]
                    completedObjects[i].points[1] = data.points[1]
                    completedObjects[i].text = data.text
                }
            }
        });
        setCompletedObjects([...completedObjects.concat()]);
        generateHistoryStep()
    }

    const clearWhiteboard = () => {
        setIncompleteObjects([])
        setCompletedObjects([])
    }

    const undoWhiteboard = () => {
        if (historyCount.current > 1) {
            historyCount.current -= 1
            setCompletedObjects([...historicSnapshots.current[(historyCount.current) - 1]])
        }
    }

    const redoWhiteboard = () => {
        if (historyCount.current <= historicSnapshots.current.length - 1) {
            setCompletedObjects([...historicSnapshots.current[historyCount.current]])
            historyCount.current += 1
        }
    }

    const handleClear = () => {
        clearWhiteboard()
        enqueueSnackbar("Whiteboard cleared");
        current.emit('clearWhiteboard', whiteboardID.current);
    }

    const handleUndo = () => {
        undoWhiteboard()
        current.emit('undoWhiteboard', whiteboardID.current);
    }

    const handleRedo = () => {
        redoWhiteboard()
        let latestLine = historicSnapshots.current[historyCount.current-1]
        current.emit('redoWhiteboard', {whiteboardID: whiteboardID.current, object: latestLine[latestLine.length-1]});
    }

    const handleJoin = (newWhiteboardID) => {
        clearWhiteboard()
        current.emit('joinWhiteboard', {whiteboardID: newWhiteboardID.whiteboardID, username: localStorage.getItem('username')});
    }

    const handleLogin = (form) => {
        let data = {
            authentication: {
                'user': form.username,
                'password': form.password
            },
            whiteboardID: whiteboardID.current
        }

        current.emit('login', data)
    }

    const handleSignup = (form) => {
        let data = {
            'user': form.username,
            'password': form.password
        }

        current.emit('signup', data)
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

    let groupScale = useRef(1);
    let groupPosX = useRef(0);
    let groupPosY = useRef(0);

    function getRelativePointerPosition(node) {
        var transform = node.getAbsoluteTransform().copy();
        // to detect relative position we need to invert transform
        transform.invert();

        // get pointer (say mouse or touch) position
        var pos = node.getStage().getPointerPosition();

        // now we can find relative point
        return transform.point(pos);
    }

    let scaleBy = 0.95;
    const handleMouseWheel = (e) => {
        let stage = e.target.getStage()
        let oldScale = groupScale.current;
        let pointer = stage.getPointerPosition()
        let mousePointTo = {
            x: (pointer.x - groupPosX.current) / oldScale,
            y: (pointer.y - groupPosY.current) / oldScale,
        };

        let newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        groupScale.current = newScale;
        //stage.scale({ x: newScale, y: newScale });
        let newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        groupPosX.current = newPos.x;
        groupPosY.current = newPos.y;
        //stage.position(newPos);

        setValue(value => value + 1);

        stage.batchDraw();
    }

    const handleChangePermissions = (newPermission) => {
        current.emit('changeGlobalPermission', {whiteboardID: whiteboardID.current, user: localStorage.getItem('uniqueID'), newPermission: newPermission})
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

    const loggedIn = (data) => {
        localStorage.setItem('uniqueID', data.uniqueID)
        localStorage.setItem('username', data.username)
        setValue(value => value + 1);
    }

    const signOut = () => {
        localStorage.removeItem('uniqueID');
        localStorage.removeItem('username')
        setValue(value => value + 1);
    }

    function ActionBar() {
        if (localStorage.getItem('uniqueID')) {
            return <UserActions ref={r => (loadWhiteboardsUI.current = r)} class={classes.adminButton} signOut={signOut} makeNewWhiteboard={makeNewWhiteboard} changePermissions={handleChangePermissions} loadWhiteboard={handleJoin} loadWhiteboards={handleLoadWhiteboards} />;
        } else {
            return <LoginButton class={classes.adminButton} login={handleLogin} signup={handleSignup} />;
        }
    }

    const handleLoadWhiteboards = () => {
        current.emit('loadWhiteboards', localStorage.getItem('uniqueID'))
    }

    const handleCreateCopy = () => {
        current.emit('createCopy', {session: localStorage.getItem('uniqueID'), whiteboardID: whiteboardID.current, username: localStorage.getItem('username')})
    }

    const handleAllowUser = (data) => {
        current.emit('allowUser', {whiteboardID: whiteboardID.current, username: data})
    }

    const handleBlockUser = (data) => {
        current.emit('blockUser', {whiteboardID: whiteboardID.current, username: data})    }

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
                    <Group
                        ref={group}
                        scale={{x: groupScale.current, y: groupScale.current}}
                        x={groupPosX.current}
                        y={groupPosY.current}
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
                                                    current.emit('updateObject', {whiteboardID: whiteboardID.current, object: completedObjects[i]});
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
                                                    current.emit('updateObject', {whiteboardID: whiteboardID.current, object: completedObjects[i]});
                                                }
                                            });
                                            setCompletedObjects([...completedObjects.concat()])
                                        }}
                                        onCanMove={isDragging}
                                    />
                                )
                            } else if (object.tool === "text") {
                                return (
                                    <BoardText
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
                                                    completedObjects[i].text = newAttrs.text
                                                    current.emit('updateObject', {whiteboardID: whiteboardID.current, object: completedObjects[i]});
                                                }
                                            });
                                            setCompletedObjects([...completedObjects.concat()])
                                        }}
                                        onCanMove={isDragging}
                                    />
                                )
                            }
                        })
                    }
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
                    </Group>
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
                    <Tooltip title="Free draw">
                        <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "line"}}>
                            <GestureIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Square">
                        <IconButton aria-label="Square" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "square"}}>
                            <CheckBoxOutlineBlankIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Circle">
                        <IconButton aria-label="Circle" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "circle"}}>
                            <RadioButtonUncheckedIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Eraser">
                        <IconButton aria-label="Eraser" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "eraser"}}>
                            <SvgIcon>
                                <path d="M15.14,3C14.63,3 14.12,3.2 13.73,3.59L2.59,14.73C1.81,15.5 1.81,16.77 2.59,17.56L5.03,20H12.69L21.41,11.27C22.2,10.5 22.2,9.23 21.41,8.44L16.56,3.59C16.17,3.2 15.65,3 15.14,3M17,18L15,20H22V18" />
                            </SvgIcon>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Text">
                        <IconButton aria-label="Text" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleStartDrawing(); tools.current.tool = "text"}}>
                            <TitleIcon />
                        </IconButton>
                    </Tooltip>
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
                    <Tooltip title="Black">
                        <IconButton aria-label="Black" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "black"}}>
                            <ColorButton color={strokes['black']}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Red">
                        <IconButton aria-label="Red" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "red"}}>
                            <ColorButton color={strokes['red']}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Green">
                        <IconButton aria-label="Green" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "green"}}>
                            <ColorButton color={strokes['green']}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Blue">
                        <IconButton aria-label="Blue" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "blue"}}>
                            <ColorButton color={strokes['blue']}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Purple">
                        <IconButton aria-label="Purple" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "purple"}}>
                            <ColorButton color={strokes['purple']}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Grey">
                        <IconButton aria-label="Grey" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {handleClose2(); tools.current.stroke = "grey"}}>
                            <ColorButton color={strokes['grey']}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Yellow">
                        <IconButton aria-label="Yellow" aria-controls="simple-menu" aria-haspopup="true"  onClick={() => {handleClose2(); tools.current.stroke = "yellow"}}>
                            <ColorButton color={strokes['yellow']}/>
                        </IconButton>
                    </Tooltip>
                    {/*<SideBarSubItem function={handleClose2} stroke={tools.current.stroke} hex={strokes['yellow']}/>*/}
                </Popover>
                <List component="nav">
                    <SidebarItem icon=<CreateIcon /> tooltip={"Draw"} function={handleClick} class={classes.button}/>
                    <SidebarItem icon=<PaletteIcon /> tooltip={"Colours"}  function={handleClick2} class={classes.button}/>
                    <SidebarItem icon=<AspectRatioIcon /> tooltip={"Manipulate object"}  function={handleMoveObjects} class={classes.button}/>
                    <SidebarItem icon=<UndoIcon /> tooltip={"Undo"}  function={handleUndo} class={classes.button}/>
                    <SidebarItem icon=<RedoIcon /> tooltip={"Redo"}  function={handleRedo} class={classes.button}/>
                    <SidebarItem icon=<DeleteIcon /> tooltip={"Clear whiteboard"}  function={handleClear} class={classes.button}/>
                </List>
            </Container>
            <Container className={classes.login} style={{display: 'inline-flex'}} maxWidth={false}>
                <ActionBar />
                <div>
                    <Button onClick={handleCreateCopy}>
                        Create copy
                    </Button>
                </div>
                <div>
                    <JoinButton class={classes.adminButton} join={handleJoin} />
                </div>
            </Container>
            <Container className={classes.viewers} style={{display: 'inline-flex'}} maxWidth={false}>
                <ViewersList viewersList={viewersList} allowUser={handleAllowUser} blockUser={handleBlockUser()} />
            </Container>
        </div>
    );
};

export default Board