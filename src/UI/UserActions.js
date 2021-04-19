import React from "react";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import IconButton from "@material-ui/core/IconButton";
import PublishIcon from "@material-ui/icons/Publish";

function UserActions(props) {
    const [age, setAge] = React.useState('');

    const handleChange = (event) => {
        setAge(event.target.value);
    };


    return (
        <div className={props.class} style={{display: 'inline-flex'}}>
            <FormControl className={props.class} >
                <Select
                    value={age}
                    onChange={handleChange}
                    displayEmpty
                >
                    <MenuItem value="">
                        <em>Read-only</em>
                    </MenuItem>
                    <MenuItem value="write">Write</MenuItem>
                </Select>
                <FormHelperText>For viewers</FormHelperText>
            </FormControl>
            <IconButton>
                <PublishIcon />
            </IconButton>
        </div>
    )
}

export default UserActions;