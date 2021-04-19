import React from 'react';
import ListItem from "@material-ui/core/ListItem";
import IconButton from "@material-ui/core/IconButton";

function sidebarItem(props) {
    return (
        <ListItem className={props.class}>
            <IconButton aria-label="Clear" onClick={props.function}>
                {props.icon}
            </IconButton>
        </ListItem>
    )
}

export default sidebarItem;