function requireAll(r) { r.keys().forEach(r); }

requireAll(require.context('file-loader?name=[name].[ext]!../src/api/', true, /\.php$/));
require('file-loader?name=[name].[ext]!../src/assets/index.html');
require('../src/css/app.scss');
require('../src/js/app.js');
