import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { loadPubsub } from './fakes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const childProcess = path.resolve(__dirname, 'child.mjs');

const tests = [];

const test = (title, fn) => {
  tests.push({ title, fn });
};

const ftest = (title, fn) => {
  tests.push({ title, fn, opt: 'only' });
};

const xtest = (title, fn) => {
  tests.push({ title, fn, opt: 'skip' });
};

setTimeout(async () => {
  await Promise.all(
    tests
      // skip
      .filter(({ opt }) => opt !== 'skip')
      // only (or all)
      .reduce(
        ([only, rest], { opt, ...test }) =>
          opt === 'only'
            ? [true, only ? [...rest, test] : [test]]
            : only
            ? [true, rest]
            : [false, [...rest, test]],
        [false, []]
      )
      .pop()
      .map(async ({ title, fn }) => {
        console.log(title);
        const pubsub = await loadPubsub();
        return fn(pubsub, title).then((message) => {
          console.log(title, message);
        });
      })
  );
  clearInterval(done);
});
const done = setInterval(() => {}, 100);

test('child -> siblings', (pubsub) => {
  return Promise.all(
    [childProcess, childProcess].map((childProcess) => {
      return new Promise((resolve) => {
        const child = fork(childProcess, {
          execArgv: [
            '--no-warnings', //'--inspect-brk=localhost:9222'
          ],
        });
        pubsub(child);
        resolve(child.pid);
      });
    })
  );
});

test('parent -> child', (pubsub, title) => {
  return new Promise((resolve) => {
    const child = fork(childProcess, {
      execArgv: [
        '--no-warnings', //'--inspect-brk=localhost:9222'
      ],
    });
    pubsub(child).publish('channel', `from ${title}`);
    resolve(child.pid);
  });
});

test('child -> parent', async (pubsub, title) => {
  return new Promise((resolve) => {
    const child = fork(childProcess, {
      execArgv: [
        '--no-warnings', //'--inspect-brk=localhost:9222'
      ],
    });
    // register and pub/sub on child connection
    const { publish, subscribe } = pubsub(child);
    subscribe('channel', (message) => {
      publish('channel', `from ${title}`);
      resolve(child.pid);
    });
  });
});

test('broadcast across connections', (pubsub, title) => {
  const child = fork(childProcess, {
    execArgv: [
      '--no-warnings', //'--inspect-brk=localhost:9222'
    ],
  });
  // register child connection
  pubsub(child);

  return new Promise((resolve) => {
    // broadcast on default (parent) connection
    pubsub().subscribe('channel', (message) => {
      pubsub().publish('channel', `from ${title}`);
      resolve(child.pid);
    });
  });
});
