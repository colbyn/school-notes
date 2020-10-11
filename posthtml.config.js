const posthtml = require('posthtml');
const sequence = require('post-sequence');

// const posthtml = require('posthtml')

// let plugins = new Map();
// plugins.set('posthtml-include', {root: __dirname});
// plugins.set('posthtml-custom-elements', {});

// const post_html_config = {
//   plugins: {
//     "posthtml-include": {
//       root: __dirname
//     },
//     "posthtml-custom-elements": {},
//   }
// };

const plugins = {
    "posthtml-custom-elements": {},
    "posthtml-include": {root: __dirname},
}

const post_html_config = {
    plugins: sequence(
        plugins,
        {
            processor: 'posthtml',
            namespace: true,
        }
    )
};

// const post_html_config = {
//     plugins: plugins
// };

module.exports = post_html_config;
