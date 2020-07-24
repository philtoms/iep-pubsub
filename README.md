# iep-pubsub

A straight forward IPC pub-sub. Works with [net sockets](https://nodejs.org/api/net.html#net_ipc_support), [child_process](https://nodejs.org/api/child_process.html) and [worker_threads](https://nodejs.org/api/worker_threads.html) out of the box.

This pubsub can publish to multiple subscribers across any combination of socket, process or thread based connections.

Also supports custom connectors that use `IPC:send -> on` semantics.

## Intentionality

The main aim of this utility is to provide seamless `publish -> subscribe` across different connection boundaries - with minimal down to zero config depending on the topology requirements.

## Usage

### with child_process

```javascript
// master_process.js
import { fork } from 'child_process';
import pubsub from 'iep-pubsub';

const child = fork('./child_process.js');

// use the child process as the pubsub connector
const { publish, subscribe } = pubsub(child);

publish('channel', 'from master');
subscribe('channel', (message) => console.log(message)); // => from child
```

```javascript
// child_process.js
import pubsub from 'iep-pubsub';

const { publish, subscribe } = pubsub();

publish('channel', 'from child');
subscribe('channel', (message) => console.log(message)); // => from master
```

### with worker_threads

```javascript
// main_thread.js
import { Worker } from 'worker_threads';
import pubsub from 'iep-pubsub';

const worker = new Worker('./worker.js');

// use the worker as the pubsub connector
const { publish, subscribe } = pubsub(worker);

publish('channel', 'from master');
subscribe('channel', (message) => console.log(message)); // => from child
```

```javascript
// worker.js
import pubsub from 'iep-pubsub';

const { publish, subscribe } = pubsub();

publish('channel', 'from worker');
subscribe('channel', (message) => console.log(message)); // => from master
```

### with sockets

```javascript
// master.js
import pubsub from 'iep-pubsub'

// create a master to coordinate socket connectors
const {publish, subscribe} = pubsub()

// use tcp and ipc address connectors
pubsub(8080) // tcp localhost:8080
pubsub('http://path/to/host:3000) // tcp path:port
pubsub('/tmp/client.sock') // ipc socket path

publish('channel', 'from master')
subscribe('channel', ({message}) => console.log(message))
  // => from localhost:8080
  // => from 'http://path/to/host:3000
  // => from /tmp/client.sock
```

```javascript
// localhost:8080
import pubsub from 'iep-pubsub';

const { publish, subscribe } = pubsub(8080);

publish('channel', 'from localhost:8080');
subscribe('channel', (message) => console.log(message)); // => from master
```

```javascript
// http://path/to/host:3000
import pubsub from 'iep-pubsub';

const { publish, subscribe } = pubsub(3000);

publish('channel', 'from http://path/to/host:3000');
subscribe('channel', (message) => console.log(message)); // => from master
```

```javascript
// /tmp/client.sock
import pubsub from 'iep-pubsub';

const { publish, subscribe } = pubsub('/tmp/client.sock');

publish('channel', 'from /tmp/client.sock');
subscribe('channel', (message) => console.log(message)); // => from master
```

### Coordinating multiple connector types

```javascript
// master.js
import { fork } from 'child_process';
import { Worker } from 'worker_threads';

import pubsub from 'iep-pubsub';

// coordinator
const { publish, subscribe } = pubsub();

// multiple connectors
pubsub(fork('./child.js'));
pubsub(new Worker('./__worker.js'));

publish('channel', 'from master');
subscribe('channel', (message) => console.log(message));
// => from child
// => from worker
```

### The API

```javascript
const { publish, subscribe, unsubscribe, once } = pubsub(connector);

// broadcast to all subscribers
publish(channel, message);

// curried publisher
const update = publish(channel);

// ...somewhere else in the code
update({ data: 123 });

// subscribe to a channel
subscribe(channel, callback);

// curried subscriber
const message = subscribe(channel);

// ...somewhere else in the code
const data = await message;

// finished with this channel?
unsubscribe(channel);

// once (= subscribe + unsubscribe)
once(channel, callback);

// in async function
const message = await once(channel);
```

### Using custom connector types

To create a custom connector type, pass a function or a promise that resolves to a function into `pubsub`.

The function will be called by pubsub with any other arguments passed to pubsub passed directly through to the function as an option spread:

```javascript
pubsub(ccFn, opt1, opt2); // => calls ccFn(opt1, opt2)
```

The function must return the minimal pubsub connector API

```javascript
{
  id, send, on;
}
```

For example a custom connector that uses [socket-io](https://www.npmjs.com/package/socket.io) transport that operates both on the server and in the browser:

```javascript
// ./io-connector.js
export default async (room, server) =>
  // await connection before establishing an asynchronous io connector
  new Promise(async resolve => {
    const io = await import(server
      ? 'socket.io'
      : '/socket.io/socket.io.js').then(module => module.default)

    io.connect(socket => {
      socket.join(room)
      resolve({
        id: socket.id,
        send: (message) => {
          socket.to(room).emit(message);
        },
        on: (event, subscriber) => {
          socket.on(event, subscriber);
        },
      }))
    };
  });
```

```javascript
//server
const app = require('express')();
const server = require('http').createServer(app);
const pubsub = require('iep-pubsub');
const io = require('./io-connector');

// waits for a browser connection...
pubsub(io, 'room-1', server);

server.listen(3000);
```

```javascript
//browser 1
import pubsub from 'iep-pubsub';
import io from './io-connector';

const { publish, subscribe } = pubsub(io, 'room-1');

subscribe(
  'channel',
  (message) => console.log(message) // hello from browser 2
);
// on click....
publish('channel', 'hello from browser 1');
```

```javascript
//browser 2
import pubsub from 'iep-pubsub';
import io from './io-connector';

const { publish, subscribe } = pubsub(io, 'room-1');

subscribe(
  'channel',
  (message) => console.log(message) // hello from browser 1
);
// on click....
publish('channel', 'hello from browser 2');
```
