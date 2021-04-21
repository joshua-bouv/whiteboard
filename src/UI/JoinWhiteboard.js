import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

function JoinButton(props) {
    const [openJoin, setOpenJoin] = React.useState(false);

    const handleClickOpen = () => {
        setOpenJoin(true);
    };

    const handleClose = () => {
        setOpenJoin(false);
    };

    const [values, setValues] = React.useState({
        whiteboardID: ''
    });

    // https://stackoverflow.com/questions/56641235/react-how-to-get-values-from-material-ui-textfield-components
    const handleChange = name => event => {
        setValues({ ...values, [name]: event.target.value});
    };

    const handleJoin = () => {
        props.join(values)
        handleClose()
    };

    return (
        <div className={props.class} style={{display: 'inline-flex'}}>
            <Button onClick={handleClickOpen}>
                Join whiteboard
            </Button>
            <Dialog open={openJoin} onClose={handleClose} aria-labelledby="login-form">
                <DialogTitle id="login-form">Join whiteboard</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="whiteboardID"
                        label="Whiteboard ID"
                        type="username"
                        onChange={handleChange('whiteboardID')}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleJoin} color="primary">
                        Join
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default JoinButton;