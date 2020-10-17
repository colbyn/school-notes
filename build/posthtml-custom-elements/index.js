const fs = require('fs');
const parser = require('posthtml-parser');
const { types } = require('util');
const util = require('util')

function $(f) {
    return f();
}

function inspect(x) {
    return util.inspect(x, {showHidden: false, depth: null});
}

function is_header_tag(tag) {
    let is_header = false;
    if (tag === 'h1') {return true};
    if (tag === 'h2') {return true};
    if (tag === 'h3') {return true};
    if (tag === 'h4') {return true};
    if (tag === 'h5') {return true};
    if (tag === 'h6') {return true};
    return is_header;
}

function has_attr(node, attr) {
    if (typeof node !== 'object') {return false};
    return node.attrs && (attr in node.attrs);
}

function is_element(node, tag_pred) {
    let result = false;
    if (typeof node !== 'object') {return false};
    if (typeof node === "object" && node !== null && 'tag' in node) {
        if (typeof tag_pred === 'function') {
            return tag_pred(node.tag);
        } else {
            console.assert(typeof tag_pred === 'string');
            return node.tag === tag_pred;
        }
    }
    return result;
}

function get_text_contents(node) {
    if (node === null || node === undefined) {
        return [];
    }
    if (typeof node === 'string') {
        return [node];
    }
    const go = () => {
        let results = [];
        if (node.content && Array.isArray(node.content)) {
            node.content.forEach((child) => {
                results = results.concat(get_text_contents(child));
            });
        } else if (Array.isArray(node)) {
            node.forEach((child) => {
                results = results.concat(get_text_contents(child));
            });
        }
        return results;
    };
    let results = [];
    for (let x of go()) {
        console.assert(typeof x === 'string');
        x = x.trim();
        if (x.length > 0) {
            results.push(x);
        }
    }
    return results;
}

function text_to_slug(input) {
    let txt = input.replace(' ', '-').toLowerCase();
    return encodeURI(txt);
}

// Ensure that `html` is a copy.
// Such as VIA `JSON.parse(JSON.stringify(object))`.
function filter_traverse(node, pred) {
    if (node === null || node === undefined) {
        return [];
    }
    if (pred(node)) {
        return [node];
    }
    // if (node.tag === 'h1') {
    //     console.log("H1", node);
    //     return [node];
    // }
    if (typeof node === 'string') {
        return [];
    }
    let results = [];
    if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child) => {
            results = results.concat(filter_traverse(child, pred));
        });
    } else if (Array.isArray(node)) {
        node.forEach((child) => {
            results = results.concat(filter_traverse(child, pred));
        });
    }
    return results;
}

function header_ids(tree) {
    const rewrite = (node) => {
        let slug = text_to_slug(get_text_contents(node).join('-'));
        if (!('attrs' in node)) {
            node.attrs = {};
        }
        if (!('id' in node.attrs)) {
            node.attrs['id'] = slug;
        }
        return node;
    };
    tree.match({tag: 'h1'}, rewrite);
    tree.match({tag: 'h2'}, rewrite);
    tree.match({tag: 'h3'}, rewrite);
    tree.match({tag: 'h4'}, rewrite);
    tree.match({tag: 'h5'}, rewrite);
    tree.match({tag: 'h6'}, rewrite);
    return tree;
}

function table_of_contents(tree) {
    const build_toc = (x) => {
        let headers = filter_traverse(x, (node) => {
            return is_element(node, is_header_tag)
        });
        let children = [];
        for (head of headers) {
            let href = text_to_slug(get_text_contents(head).join('-'));
            if (head.attrs && ('id' in head.attrs)) {
                href = head.attrs['id'];
            }
            children.push(element(
                'li',
                {'entry': head.tag},
                [element(
                    'a',
                    {href: `#${href}`},
                    head.content
                )]
            ));
        }
        return children;
    };

    const get_body = () => {
        let body = {};
        if (Array.isArray(tree)) {
            tree.match({ tag: 'body' }, (node) => {
                if (body === null) {
                    Object.assign(node, body);
                }
                return node;
            });
        } else {
            body = tree;
        }
        return JSON.parse(JSON.stringify(tree[2]));
    };
    
    return tree.match({ tag: 'toc' }, (node) => {
        const body = get_body();
        let toc = build_toc(body);
        let sub = node.children || [];
        sub.push(element(
            'ul',
            {'toc': ''},
            toc,
        ));
        node = element(
            'div',
            {'toc': ''},
            sub
        );
        return node;
    });
}

function element(tag, attrs, children) {
    if (attrs === null || attrs === undefined) {
        attrs = {};
    }
    if (typeof attrs !== 'object') {
        attrs = {};
    }
    return {
        'tag': tag || 'div',
        'attrs': attrs || {},
        'content': children
    }
}

function is_block_node(node) {
    let is_block = false;
    if (typeof node !== 'object') {return false};
    if (node.tag === 'note') {
        return true;
    }
    if (node.attrs && 'block' in node.attrs) {
        is_block = true;
    }
    if (node.tag === 'tex') {
        if (node.attrs && 'block' in node.attrs) {
            is_block = true;
        }
        if (node.attrs && 'src' in node.attrs) {
            is_block = true;
        }
    }
    return is_block;
}

function is_inline_node(node) {
    let is_inline = false;
    // BLOCK MODE
    if (typeof node === 'string') {
        return true;
    }
    if (typeof node === 'object') {
        if (!('attrs' in node)) {
            node.attrs = {};
        }
    }
    if (node.attrs && 'block' in node.attrs) {
        return false;
    }
    if (node.tag === 'tex') {
        return !is_block_node(node);
    }
    if (node.tag === 'a') {return true;}
    if (node.tag === 'abbr') {return true;}
    if (node.tag === 'audio') {return true;}
    if (node.tag === 'b') {return true;}
    if (node.tag === 'bdo') {return true;}
    if (node.tag === 'br') {return true;}
    if (node.tag === 'button') {return true;}
    if (node.tag === 'canvas') {return true;}
    if (node.tag === 'cite') {return true;}
    if (node.tag === 'code') {return true;}
    if (node.tag === 'command') {return true;}
    if (node.tag === 'data') {return true;}
    if (node.tag === 'datalist') {return true;}
    if (node.tag === 'dfn') {return true;}
    if (node.tag === 'em') {return true;}
    if (node.tag === 'embed') {return true;}
    if (node.tag === 'i') {return true;}
    if (node.tag === 'iframe') {return true;}
    if (node.tag === 'img') {return true;}
    if (node.tag === 'input') {return true;}
    if (node.tag === 'kbd') {return true;}
    if (node.tag === 'keygen') {return true;}
    if (node.tag === 'label') {return true;}
    if (node.tag === 'mark') {return true;}
    if (node.tag === 'math') {return true;}
    if (node.tag === 'meter') {return true;}
    if (node.tag === 'noscript') {return true;}
    if (node.tag === 'object') {return true;}
    if (node.tag === 'output') {return true;}
    if (node.tag === 'picture') {return true;}
    if (node.tag === 'progress') {return true;}
    if (node.tag === 'q') {return true;}
    if (node.tag === 'ruby') {return true;}
    if (node.tag === 'samp') {return true;}
    if (node.tag === 'script') {return true;}
    if (node.tag === 'select') {return true;}
    if (node.tag === 'small') {return true;}
    if (node.tag === 'span') {return true;}
    if (node.tag === 'strong') {return true;}
    if (node.tag === 'sub') {return true;}
    if (node.tag === 'sup') {return true;}
    if (node.tag === 'svg') {return true;}
    if (node.tag === 'textarea') {return true;}
    if (node.tag === 'time') {return true;}
    if (node.tag === 'var') {return true;}
    if (node.tag === 'video') {return true;}
    if (node.tag === 'wbr') {return true;}
    return is_inline;
}

function copy_all(xs) {
    let ys = [];
    for (x of xs) {
        ys.push(x);
    }
    return ys;
}

function is_punctuation_mark(txt_input) {
    if (txt_input === undefined || txt_input === null) {return false}
    if (typeof txt_input !== 'string') {return false}
    let value = txt_input.trim();
    let result = false;
    if (value === '.') {return true}
    if (value === '?') {return true}
    if (value === '!') {return true}
    if (value === ':') {return true}
    if (value === ',') {return true}
    return result;
}

function note_block(tree) {
    return tree.match({ tag: 'note' }, (node) => {
        let children = [];
        let current_paragraph = [];
        for (ix in node.content) {
            let child = node.content[ix];
            if (is_inline_node(child)) {
                let is_empty = false;
                if (typeof child === 'string' && child.trim().length === 0) {
                    is_empty = true;
                }
                if (!is_empty) {
                    current_paragraph.push(child);
                }
            } else {
                if (current_paragraph.length > 0) {
                    let paragraph = element(
                        "p",
                        {},
                        copy_all(current_paragraph)
                    );
                    current_paragraph = null;
                    current_paragraph = [];
                    children.push(paragraph);
                }
                children.push(child);
            }
        }
        if (current_paragraph.length > 0) {
            children.push(element(
                "p",
                {},
                copy_all(current_paragraph)
            ));
        }
        let attrs = node.attrs || {};
        attrs.class = 'note-block block';
        node = element("section", attrs, [children]);
        // Object.assign(node, new_element);
        return node
    })
}

function latex(tree) {
    return tree.match({ tag: 'tex' }, (node) => {
        let start_token = '\\(';
        let end_token = '\\)';
        let tag = 'span';
        let attrs = {};
        if (is_block_node(node)) {
            start_token = '$$';
            end_token = '$$';
            tag = 'div';
            attrs = {'block': '', 'math-block': ''};
        } else {
            attrs = {'inline': '', 'math-inline': ''};
        }
        // // RUN
        // // if (!node.attrs || !('attrs' in node)) {
        // //     node.attrs = {};
        // // }
        if (node.attrs && 'src' in node.attrs) {
            const file_path = node.attrs.src;
            const data = fs.readFileSync(file_path, 'utf8');
            node = element(tag, attrs, [
                `${start_token} ${data} ${end_token}`
            ]);
        } else {
            const data = [];
            data.push(start_token);
            data.push(get_text_contents(node.content).join(' ') || '');
            data.push(end_token);
            node = element(tag, attrs || {}, data);
        }
        console.assert('attrs' in node);
        console.assert(node.attrs !== undefined);
        console.assert(node.attrs !== null);
        return node
    })
}

function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"_"+S4()+"_"+S4()+"_"+S4()+"_"+S4()+S4()+S4());
}

function geogebra(tree) {
    const init = (setup) => {
        const uid = `geo_${guidGenerator()}`;
        return `
        <div id="${uid}" style="width: 100%;"></div>
        <script>
        var ${uid}_setup = new GGBApplet(
            {
                id: "${uid}",
                "appName": '${setup.app_type}',
                "width": ${setup.width} || window.innerWidth,
                "height": ${setup.height} || 500,
                "showToolBar": false,
                "allowStyleBar": false,
                "showAlgebraInput": false,
                "showMenuBar": false,
                "showScreenshot": false,
                "showTutorialLink": false,
                "borderColor": "#FFFFFF",
                "showResetIcon": false,
                "enableUndoRedo": false,
                "enableLabelDrags": false,
                "enableShiftDragZoom": false,
                "enableRightClick": false,
                "preventFocus": true,
                appletOnLoad: (x) => {
                    for (cmd of ${JSON.stringify(setup.commands)}) {
                        window.${uid}.evalCommand(cmd);
                    }
                    if (!${setup.width}) {
                        window.${uid}.setWidth(window.innerWidth);
                    }
                }
            },
            true
        );
        window.addEventListener("load", function() {
            ${uid}_setup.inject('${uid}', 'preferHTML5');
        });
        window.addEventListener('resize', (event) => {
            let width = window.innerWidth;
            if (!${setup.width}) {
                window.${uid}.setWidth(width);
            }
        });
        </script>
        `
    };
    return tree.match({ tag: 'geogebra' }, (node) => {
        // let app_type = 'geometry';
        let app_type = 'classic';
        let width = null;
        let height = 500;
        if (!('attrs' in node)) {
            node.attrs = {};
        }
        if (node.attrs && 'type' in node.attrs) {
            app_type = node.attrs.type;
        }
        if (node.attrs && 'width' in node.attrs) {
            width = node.attrs.width;
        }
        if (node.attrs && 'height' in node.attrs) {
            height = node.attrs.height;
        }
        let commands = [
            'SetPerspective("G")'
        ];
        for (child of node.content) {
            if (child.tag && child.tag === 'expr') {
                commands.push(child.content.join("\n"));
            }
        }
        let body = init({
            commands: commands,
            app_type: app_type,
            width: width,
            height: height,
        });
        node.tag = "div";
        node.attrs['block'] = '';
        node.attrs['geogebra'] = '';
        node.attrs['style'] = `
        width: 100%;
        max-width: unset;
        margin: 0;
        `;
        node.content = [body];
        return node;
    });
}

// <desmos>
//     <expr>y=x^2</expr>
// </desmos>
function desmos(tree) {
    const init = (setup) => {
        const uid = `des_${guidGenerator()}`;
        return `
        <div id="${uid}" style="width: ${setup.width || '100%'}; height: ${setup.height || '400px'}; margin: 0 auto;"></div>
        <script>
        window.addEventListener("load", function on_load() {
            var elt = document.getElementById('${uid}');
            var options = {
                expressionsCollapsed: true,
                expressions: ${setup.show_expressions},
                lockViewport: ${setup.lockViewport},
                settingsMenu: false,
                border: false,
                xAxisNumbers: ${setup.xAxisNumbers},
                yAxisNumbers: ${setup.yAxisNumbers},
                showGrid: ${setup.showGrid},
            };
            var calculator = Desmos.GraphingCalculator(elt, options);
            ${setup.math_bounds}
            for (cmd of ${JSON.stringify(setup.commands)}) {
                calculator.setExpression(cmd);
            }
        });
        </script>
        `
    };
    return tree.match({ tag: 'desmos' }, (node) => {
        let width = "100%";
        let height = "500px";
        let lockViewport = true;
        let show_expressions = true;
        let math_bounds = null;
        let errors = [];
        let xAxisNumbers = true;
        let yAxisNumbers = true;
        let showGrid = true;
        if (!('attrs' in node)) {
            node.attrs = {};
        }
        if (has_attr(node, 'width')) {
            width = node.attrs.width;
        }
        if (has_attr(node, 'height')) {
            height = node.attrs.height;
        }
        if (has_attr(node, 'lock')) {
            lockViewport = node.attrs.lock;
        }
        if (has_attr(node, 'controls')) {
            show_expressions = node.attrs.controls;
        }
        if (has_attr(node, 'math-bounds') && node.attrs['math-bounds'] !== undefined) {
            const bounds = node.attrs['math-bounds'];
            try {
                math_bounds = `calculator.setMathBounds(${inspect(JSON.parse(bounds))});`;
            }
            catch(e) {
                console.error('DESMOS HELPER: invalid math-bounds:', bounds);
                console.error(e);
                errors.push(`${e}`);
                math_bounds = `let _ = null;`;
            }
        } else {
            math_bounds = `let _ = undefined;`;
        }
        if (has_attr(node, 'x-axis-numbers') && node.attrs['x-axis-numbers'] !== undefined) {
            xAxisNumbers = node.attrs['x-axis-numbers'];
        }
        if (has_attr(node, 'y-axis-numbers') && node.attrs['y-axis-numbers'] !== undefined) {
            yAxisNumbers = node.attrs['y-axis-numbers'];
        }
        if (has_attr(node, 'show-grid') && node.attrs['show-grid'] !== undefined) {
            showGrid = node.attrs['show-grid'];
        }
        let commands = [];
        for (child of node.content) {
            const get_text = () => {
                let txts = [];
                for (let x of get_text_contents(child)) {
                    let words = []
                    for (let word of x.split('\n')) {
                        words.push(word.trim());
                    }
                    txts.push(words);
                }
                return txts.join(" ");
            };
            if (child.tag && child.tag === 'cmd') {
                try {
                    commands.push(JSON.parse(get_text_contents(child).join("\n")));
                }
                catch(e) {
                    console.error('Invalid Desmos CMD JSON:', e);
                    errors.push(`${e}`);
                }
            }
            if (child.tag && child.tag === 'expr') {
                let config = {};
                config.latex = get_text();
                if (child.attrs && 'id' in child.attrs) {
                    config.id = child.attrs.id;
                }
                if (has_attr(child, 'label') && (child.attrs.label !== undefined)) {
                    let label = child.attrs.label;
                    config.label = label;
                    config.showLabel = true;
                }
                if (has_attr(child, 'label-orientations') && (child.attrs['label-orientations'] !== undefined)) {
                    let label_orientations = child.attrs['label-orientations'];
                    config['labelOrientation'] = label_orientations;
                }
                if (has_attr(child, 'label-size') && (child.attrs['label-size'] !== undefined)) {
                    let labelSize = child.attrs['label-size'];
                    config['labelSize'] = labelSize;
                }
                commands.push(config);
            }
        }
        const render_errors = () => {
            let xs = [];
            for (let x of errors) {
                xs.push(element("p", {'error-block': ''}, x));
            }
            return xs;
        };
        let body = init({
            commands: commands,
            width: width,
            height: height,
            lockViewport: lockViewport,
            show_expressions, show_expressions,
            math_bounds: math_bounds,
            xAxisNumbers: xAxisNumbers,
            yAxisNumbers: yAxisNumbers,
            showGrid: showGrid,
        });
        node.tag = "div";
        node.attrs['block'] = '';
        node.attrs['desmos'] = '';
        node.attrs['style'] = `
        width: 100%;
        max-width: unset;
        margin: 0;
        `;
        node.content = []
            .concat([element('div', {}, render_errors())])
            .concat([body]);
        return node;
    });
}

function image_max_width_helper(tree) {
    tree.match({ tag: 'img' }, (node) => {
        if (has_attr(node, 'width')) {
            const prop = `min-width: 0; max-width: ${node.attrs.width};`;
            node.attrs.style = prop;
        }
        return node;
    });
}

module.exports = function postHTMLPluginName(options = {}) {
    return (tree) => {
        tree.match({ tag: 'include' }, (node) => {
            console.log("WARNING: include tag - this should already be procesed");
            console.warn("WARNING: include tag - this should already be procesed");
            return node;
        });
        header_ids(tree);
        note_block(tree);
        table_of_contents(tree);
        latex(tree);
        geogebra(tree);
        desmos(tree);
        image_max_width_helper(tree);
        return tree;
    }
}
