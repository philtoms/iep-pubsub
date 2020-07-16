const tests = [];

export const test = (title, fn) => {
  tests.push({ title, fn });
};

export const ftest = (title, fn) => {
  tests.push({ title, fn, opt: 'only' });
};

export const xtest = (title, fn) => {
  tests.push({ title, fn, opt: 'skip' });
};

test.only = ftest;
test.skip = xtest;

let testSetup = () => {};

export const setup = (fn) => (testSetup = fn);

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
        const setup = [].concat(await testSetup());
        return fn(...[...setup, title])
          .then((message) => {
            console.log(title, message);
          })
          .catch((err) => {
            console.error(title, err);
          });
      })
  );
  clearInterval(done);
});

const done = setInterval(() => {}, 100);
