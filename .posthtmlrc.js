const posthtml = require('posthtml')

module.exports = {
  plugins: {
    "posthtml-include": {
      root: __dirname
    },
    "posthtml-custom-elements": {},
  }
};