import React from "react";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import {Button} from "@material-ui/core";

function UserActions(props) {
    const [permissions, setPermissions] = React.useState('read');

    const handleChange = (event) => {
        setPermissions(event.target.value)
        props.changePermissions(event.target.value)
    };

    return (
        <div className={props.class}>
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
            <Button onClick={props.loadWhiteboards}>
                Load Whiteboard
            </Button>
        </div>
    )
}

export default UserActions;