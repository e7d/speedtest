function requireAll(r) { r.keys().forEach(r); }

// API
requireAll(require.context('file-loader?name=[name].[ext]!../src/api/', true, /\.php$/));

// HTML
require('file-loader?name=[name].[ext]!../src/assets/index.html');

// CSS
require('bootstrap/dist/css/bootstrap.css');
require('../src/css/app.scss');

// JS
require('lodash');
window.jQuery = require('jquery');
require('bootstrap');
require('../src/js/app.js');
