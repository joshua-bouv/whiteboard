import React from 'react';
import ListItem from "@material-ui/core/ListItem";
import IconButton from "@material-ui/core/IconButton";
import {Tooltip} from "@material-ui/core";

function sidebarItem(props) {
    return (
        <ListItem className={props.class}>
            <Tooltip title={props.tooltip} placement="right">
                <IconButton aria-label="Clear" onClick={props.function}>
                    {props.icon}
                </IconButton>
            </Tooltip>
        </ListItem>
    )
}

export default sidebarItem;