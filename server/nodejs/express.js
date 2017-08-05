//@ts-check

const express = require('express');
const app = express();
const port = process.argv[2] || 80;
const basePath = process.argv[3] || '../../dist';

// prepare a random data buffer of 128KB
const buffer = new Buffer(128 * 1024);
for (let bufferIndex = 0; bufferIndex < buffer.byteLength; bufferIndex++) {
    buffer[bufferIndex] = Math.random();
}

const getRandomData = (size = 8) => {
    // build the data array of desired size from the buffer
    const data = new Buffer(size * 1024 * 1024);
    for (let dataIndex = 0; dataIndex * buffer.byteLength < size; dataIndex++) {
        data.set(
            buffer,
            dataIndex * buffer.byteLength
        );
    }

    return data;
};

app.get('/ip', (request, response) => {
    response.send(
        request.connection.remoteAddress
    );
});
app.get('/ping', (request, response) => {
    response.send();
});
app.get('/download', (request, response) => {
    response.send(
        getRandomData(request.query.size)
    );
});
app.post('/upload', (request, response) => {
    response.send();
});

app.use(express.static(basePath));

app.listen(port, () => {
    console.log('Server running at http://0.0.0.0:' + port + '/');
});
