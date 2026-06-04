import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'; // Import Provider
import store from './store/store.js';   // Import Store
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.jsx';


ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </Provider>
);