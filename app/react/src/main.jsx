import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@ui5/webcomponents/dist/Assets.js';
// ensure table webcomponent is registered
import '@ui5/webcomponents/dist/Table.js';
import '@ui5/webcomponents/dist/TableColumn.js';
import '@ui5/webcomponents/dist/TableRow.js';
import '@ui5/webcomponents/dist/TableCell.js';
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
