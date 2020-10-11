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

function is_element(node, tag_pred) {
    let result = false;
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
    if (node.tag === 'h1') {
        console.log("H1", node);
        return [node];
    }
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
        node.attrs['id'] = slug;
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
            let slug = text_to_slug(get_text_contents(head).join('-'));
            children.push(element(
                'li',
                {'entry': head.tag},
                [element(
                    'a',
                    {href: `#${slug}`},
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
        'attrs': attrs,
        'content': children
    }
}

function is_block_node(node) {
    let is_block = false;
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

function note_block(tree) {
    return tree.match({ tag: 'note' }, (node) => {
        let children = [];
        let current_paragraph = [];
        for (child of node.content) {
            if (typeof child === 'string') {
                // TRIM
                child = child.trim();
                // FILTER EMPTY
                if (!child.length) {continue;}
            }
            if (is_inline_node(child)) {
                current_paragraph.push(child);
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
        children.push(element(
            "p",
            {},
            copy_all(current_paragraph)
        ));
        let new_element = element(
            "section",
            {
                'class': 'note-block block',
            },
            [
                children
            ]
        );
        node = new_element;
        // Object.assign(node, new_element);
        return node
    })
}

function latex(tree) {
    return tree.match({ tag: 'tex' }, (node) => {
        let is_inline = true;
        let start_token = '\\(';
        let end_token = '\\)';
        let tag = 'span';
        let attrs = {};
        if (is_block_node(node)) {
            is_inline = false;
            start_token = '$$';
            end_token = '$$';
            tag = 'div';
            attrs = {'block': '', 'math-block': ''};
        } else {
            attrs = {'inline': '', 'math-inline': ''};
        }
        // RUN
        if (node.attrs && 'src' in node.attrs) {
            const file_path = node.attrs.src;
            const data = fs.readFileSync(file_path, 'utf8');
            let new_element = element(tag, attrs, [
                `${start_token} ${data} ${end_token}`
            ]);
            Object.assign(node, new_element);
        } else {
            const data = [];
            data.push(start_token);
            data.push(node.content);
            data.push(end_token);
            let new_element = element(tag, attrs, data);
            Object.assign(node, new_element);
        }
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
                "borderColor": false,
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

function desmos(tree) {
    const init = (setup) => {
        const uid = `des_${guidGenerator()}`;
        return `
        <div id="${uid}" style="width: ${setup.width || '100%'}; height: ${setup.height || '400px'};"></div>
        <script>
        window.addEventListener("load", function on_load() {
            var elt = document.getElementById('${uid}');
            var options = {
                expressionsCollapsed: true,
                lockViewport: ${setup.lockViewport || true},
            };
            var calculator = Desmos.GraphingCalculator(elt, options);
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
        if (!('attrs' in node)) {
            node.attrs = {};
        }
        if (node.attrs && 'width' in node.attrs) {
            width = node.attrs.width;
        }
        if (node.attrs && 'height' in node.attrs) {
            height = node.attrs.height;
        }
        if (node.attrs && ('lock' in node.attrs)) {
            lockViewport = node.attrs.lock;
        }
        let commands = [];
        for (child of node.content) {
            if (child.tag && child.tag === 'cmd') {
                let txt = get_text_contents(child).join("\n");
                commands.push(txt);
            }
            if (child.tag && child.tag === 'expr') {
                let id = null;
                let txt = get_text_contents(child).join("\n");
                if (child.attrs && 'id' in child.attrs) {
                    id = child.attrs.id;
                }
                commands.push({latex: txt, id: id});
            }
        }
        let body = init({
            commands: commands,
            width: width,
            height: height,
            lockViewport: lockViewport,
        });
        node.tag = "div";
        node.attrs['block'] = '';
        node.attrs['desmos'] = '';
        node.attrs['style'] = `
        width: 100%;
        max-width: unset;
        margin: 0;
        `;
        node.content = [body];
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
        latex(tree);
        geogebra(tree);
        desmos(tree);
        table_of_contents(tree);
        return tree;
    }
}
