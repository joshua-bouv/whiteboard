import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import {Button, Tooltip} from "@material-ui/core";
import BlockIcon from '@material-ui/icons/Block';
import CreateIcon from '@material-ui/icons/Create';
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import Paper from '@material-ui/core/Paper';

const useStyles = makeStyles((theme) => ({
    root: {
        position: 'relative',
    },
    dropdown: {
        position: 'absolute',
        bottom: 40,
        right: 0,
        zIndex: 1,
        backgroundColor: theme.palette.background.paper,
        padding: '5px'
    },
}));

function ViewersList(props) {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    let viewersList = props.viewersList;

    const handleClick = () => {
        setOpen((prev) => !prev);
    };

    const handleClickAway = () => {
        setOpen(false);
    };

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <div className={classes.root}>
                <Button type="button" onClick={handleClick}>
                    View viewers
                </Button>
                {open ? (
                    <Paper className={classes.dropdown}>
                        {viewersList.map((object) => {
                            return (
                                <div key={object} style={{display: 'inline-flex', width: '250px', right: '0', justifyContent: 'flex-end'}}>
                                    <Typography style={{width: 'inherit', alignSelf: 'center'}}>
                                        {object}
                                    </Typography>
                                    <Tooltip title="Block access">
                                        <IconButton onClick={() => {props.blockUser(object)}}>
                                            <BlockIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Give access">
                                        <IconButton onClick={() => {props.allowUser(object)}}>
                                            <CreateIcon />
                                        </IconButton>
                                    </Tooltip>
                                </div>
                            )
                        })}
                    </Paper>
                ) : null}
            </div>
        </ClickAwayListener>
    );
}

export default ViewersList;