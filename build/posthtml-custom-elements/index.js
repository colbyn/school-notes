const fs = require('fs');
const parser = require('posthtml-parser');
const { types } = require('util');

function $(f) {
    return f();
}

function element(tag, attrs, children) {
    return {
        'tag': tag,
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
        node.content = null;
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
            if (child.tag && child.tag === 'cmd') {
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
                calculator.setExpression({id: 'graph1', latex: \`\$\{cmd\}\`});
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

        let commands = [

        ];
        for (child of node.content) {
            if (child.tag && child.tag === 'cmd') {
                commands.push(child.content.join("\n"));
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
        note_block(tree);
        latex(tree);
        geogebra(tree);
        desmos(tree);
    }
}
