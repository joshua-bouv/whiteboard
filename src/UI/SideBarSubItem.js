import React from 'react';
import IconButton from "@material-ui/core/IconButton";
import {ColorButton} from "material-ui-color";

function SideBarSubItem(props) {
    return (
        <IconButton aria-label="Draw" aria-controls="simple-menu" aria-haspopup="true" onClick={() => {props.function(); props.stroke = "yellow"}}>
            {console.log(props.hex)}
            <ColorButton color={props.hex}/>
        </IconButton>
    )
}

export default SideBarSubItem;