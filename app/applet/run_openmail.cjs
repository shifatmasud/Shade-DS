const path = require('path');
process.chdir(path.join(__dirname, 'bin'));
process.argv = ['node', 'openmail', 'list', '--label', 'UNREAD', '--max', '3'];
require('./openmail');
