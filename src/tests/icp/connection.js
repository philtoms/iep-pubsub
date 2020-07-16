import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const childProcess = path.resolve(__dirname, 'server.js');

export default (id = 1) => {
  const child = fork(childProcess, [id], {
    execArgv: [
      '--no-warnings', //'--inspect-brk=localhost:9222'
    ],
  });

  return `${child.pid}\\${id}`;
};
