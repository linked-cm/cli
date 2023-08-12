const fs = require('fs');
const which = require('which');
const homedir = require('os').homedir();
const path = require('path');

which('node').then(resolved => {
  try {
    fs.writeFileSync(
      path.join(homedir, '.huskyrc'),
      `export PATH="${path.join(resolved, '..')}:$PATH"`,
    );
  } catch (err) {
    console.log(err);
  }
  console.log('created .huskyrc in ' + homedir);
});
