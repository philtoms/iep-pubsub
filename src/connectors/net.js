import net from 'net';

const delimiter = '\\0\\0\\0\\0';

const client = (port, host, path, resolve) => {
  const socket = path
    ? net.createConnection(path)
    : net.createConnection(port, host);

  socket.on('error', (err) => {
    if (err.syscall === 'connect') {
      setTimeout(() => client(port, host, path, resolve), 100);
    }
  });

  socket.on('connect', () => {
    console.log(`client connected`);
    resolve(socket);
  });
};

const server = (port, host, path, resolve) => {
  const server = net.createServer((connection) => {
    console.log(`server connected`);
    resolve(connection);
  });

  if (path) {
    server.listen(path, () => console.log(`server listening on ${path}`));
  } else {
    server.listen(port, host, () =>
      console.log(`server listening on ${host}:${port}`)
    );
  }
};

const api = (id, connection) => ({
  id,

  send: async (message) => {
    const socket = await connection;
    socket.write(JSON.stringify({ message }));
    socket.write(delimiter);
  },

  on: async (event, subscriber) => {
    const socket = await connection;
    if (event === 'message') {
      let buffer = '';
      socket.on('data', (data) => {
        buffer += data.toString();
        while (buffer.includes(delimiter)) {
          const [message, ...rest] = buffer.split(delimiter);
          subscriber(JSON.parse(message).message);
          buffer = rest.join(delimiter);
        }
      });
    } else {
      socket.on(event, subscriber);
    }
  },

  close: async () => {
    const socket = await connection;
    if (socket.server) {
      console.log(`closing server ${id}`);
      socket.server.unref();
      socket.destroy();
    }
  },
});

export default (connection = {}, isMaster) => {
  let host, port, path, id;
  if (connection.port || connection.host) {
    host = connection.host || 'localhost';
    port = connection.port;
    id = `${host}:${port}`;
  } else if (connection.path) {
    path = connection.path;
    id = path;
  }

  if (/^\d+$/.test(connection)) {
    id = connection;
    port = connection;
    host = 'localhost';
  } else {
    if (typeof connection === 'string') {
      id = connection;
      const tcp = connection.match(/(?<host>.+):(?<port>\d+)$/);
      if (tcp) {
        ({ host, port } = tcp.groups);
      } else {
        path = `\\\\?\\pipe\\${connection}`;
      }
    }
  }
  if (host || path) {
    return api(
      id,
      new Promise((resolve) =>
        isMaster
          ? client(port, host, path, resolve)
          : server(port, host, path, resolve)
      )
    );
  } else return false;
};
