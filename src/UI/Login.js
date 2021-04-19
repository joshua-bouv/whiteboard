import React, {useRef} from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

function LoginButton(props) {
    const [openLogin, setOpenLogin] = React.useState(false);
    const [openSignup, setOpenSignup] = React.useState(false);

    const handleClickOpen = () => {
        setOpenLogin(true);
    };

    const handleClose = () => {
        setOpenLogin(false);
    };

    const handleClickOpenSignup = () => {
        setOpenSignup(true);
    };

    const handleCloseSignup = () => {
        setOpenSignup(false);
    };

    const [values, setValues] = React.useState({
        username: '',
        password: ''
    });

    // https://stackoverflow.com/questions/56641235/react-how-to-get-values-from-material-ui-textfield-components
    const handleChange = name => event => {
        setValues({ ...values, [name]: event.target.value});
    };

    const handleLogin = () => {
        props.login(values)
        handleClose()
    };

    const handleSignup = () => {
        props.signup(values)
        handleCloseSignup()
    };

    return (
        <div className={props.class} style={{display: 'inline-flex'}}>
            <Button onClick={handleClickOpen}>
                Login
            </Button>
            <Dialog open={openLogin} onClose={handleClose} aria-labelledby="login-form">
                <DialogTitle id="login-form">Login</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="username"
                        label="Username"
                        type="username"
                        onChange={handleChange('username')}
                        fullWidth
                    />
                    <TextField
                        margin="dense"
                        id="password"
                        label="Password"
                        type="password"
                        onChange={handleChange('password')}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleLogin} color="primary">
                        Login
                    </Button>
                </DialogActions>
            </Dialog>
            <Button onClick={handleClickOpenSignup}>
                Signup
            </Button>
            <Dialog open={openSignup} onClose={handleCloseSignup} aria-labelledby="signup-form">
                <DialogTitle id="signup-form">Signup</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="username"
                        label="Username"
                        type="username"
                        onChange={handleChange('username')}
                        fullWidth
                    />
                    <TextField
                        margin="dense"
                        id="password"
                        label="Password"
                        type="password"
                        fullWidth
                    />
                    <TextField
                        margin="dense"
                        id="passwordConfirm"
                        label="Confirm Password"
                        type="password"
                        onChange={handleChange('password')}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSignup} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleSignup} color="primary">
                        Signup
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default LoginButton;