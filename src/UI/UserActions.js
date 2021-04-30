import React, {forwardRef, useImperativeHandle, useState} from "react";
import { makeStyles } from '@material-ui/core/styles';
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import {Button} from "@material-ui/core";
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Modal from '@material-ui/core/Modal';
import {useSnackbar} from "notistack";

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
    card: {
        minWidth: 242,
        maxWidth: 242,
        minHeight: 180,
        maxHeight: 180,
    },
    media: {
        height: '60px',
        width: '242px',
        objectFit: 'none',
    },
}));

const UserActions = forwardRef((props, ref) => {
    const classes = useStyles();
    const [permissions, setPermissions] = useState(props.whiteboardData.globalPermissions);
    const [open, setOpen] = useState(false);
    let [savedWhiteboards, setSavedWhiteboards] = useState([]);
    const { enqueueSnackbar } = useSnackbar();

    useImperativeHandle(ref, () => ({
        updateSavedWhiteboards: (data) => {
            setSavedWhiteboards(data)
        }
    }));

    const handleOpen = () => {
        props.loadWhiteboards()
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleMakeNewClose = () => {
        setOpen(false);
        props.makeNewWhiteboard()
    };

    const handleChange = (event) => {
        if (localStorage.getItem('uniqueID') === props.whiteboardData.owner) {
            setPermissions(event.target.value)
            props.changePermissions(event.target.value)
        } else {
            enqueueSnackbar("Only an owner can change global permissions of a whiteboard")
        }
    };

    return (
        <div className={props.class}>
            <Button className={props.class} onClick={props.signOut}>
                Sign out
            </Button>
            <FormControl className={props.class} >
                <Select
                    value={permissions}
                    onChange={handleChange}
                    displayEmpty
                >
                    <MenuItem value="read">
                        <em>Read-only</em>
                    </MenuItem>
                    <MenuItem value="write">Write</MenuItem>
                </Select>
                <FormHelperText>For viewers</FormHelperText>
            </FormControl>
            <Button onClick={handleOpen}>
                Load whiteboard
            </Button>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                style={{'maxWidth': 500, display:'flex', 'justifyContent':'center', 'alignItems':'center', 'margin': 'auto'}}
            >
                <Grid container spacing={1}>
                    <Grid container item xs={12} spacing={1}>
                        {
                            savedWhiteboards.map((whiteboard, i) => {
                                return (
                                    <Grid item xs={6}>
                                        <Card className={classes.card}>
                                            <CardActionArea onClick={() => props.loadWhiteboard({whiteboardID: whiteboard.name})}>
                                                <CardMedia
                                                    className={classes.media}
                                                    component='img'
                                                    src={whiteboard.snapshot}
                                                />
                                                <CardContent>
                                                    <Typography gutterBottom variant="h5" component="h2">
                                                        {whiteboard.name}
                                                    </Typography>
                                                </CardContent>
                                            </CardActionArea>
                                            <CardActions>
                                                <Button size="small" color="primary" onClick={() => props.loadWhiteboard({whiteboardID: whiteboard.name})}>
                                                    Load
                                                </Button>
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                )
                            })
                        }
                        <Grid item xs={6}>
                            <Card className={classes.card}>
                                <CardActionArea onClick={handleMakeNewClose}>
                                    <CardContent>
                                        <Typography gutterBottom variant="h5" component="h2">
                                            New whiteboard
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                                <CardActions style={{'marginTop': '60px'}}>
                                    <Button size="small" color="primary" onClick={handleMakeNewClose}>
                                        Create
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Modal>
        </div>
    )
});

export default UserActions;