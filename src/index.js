import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import Board from './UI/whiteboard.js';
import * as serviceWorker from './serviceWorker';
import { SnackbarProvider } from 'notistack';

ReactDOM.render(
    <SnackbarProvider maxSnack={3}>
        <Board />
    </SnackbarProvider>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();