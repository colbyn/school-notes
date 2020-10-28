import { type } from "os";

function $<T>(f: () => T): T {
    return f();
}

function new_linear_scale(
    start: [number, number],
    end: [number, number]
): (value: number) => number {
    return (value) => {
        return (value - start[0])
            * (end[1] - end[0])
            / (start[1] - start[0]) + end[0];
    };
}

function to_screen_cordinates(
    canvas: HTMLCanvasElement,
    point: {x: number, y: number}
): {x: number, y: number} {
    const width = canvas.width;
    const height = canvas.height;
    const base = 2 * (window.devicePixelRatio || 1);
    const screen_width = width / 2;
    const screen_height = height / 2;
    const x_scale = new_linear_scale([0, 100], [0, screen_width]);
    const y_scale = new_linear_scale([0, 100], [0, screen_height]);
    const cart_x = x_scale(point.x);
    const cart_y = y_scale(point.y);
    const screen_x = cart_x + screen_width;
    const screen_y = screen_height - cart_y;
    return {
        x: screen_x / window.devicePixelRatio,
        y: screen_y / window.devicePixelRatio
    };
}


type Point = {x: string | number, y: string | number};

function point(x: string | number, y: string | number): Point {
    return {x, y};
}

///////////////////////////////////////////////////////////////////////////////
// SVG HELPERS
///////////////////////////////////////////////////////////////////////////////

type V1 = string | number;

type CircleCmd = {
    pos: Point,
    r: string | number
};

type LineCmd = {
    start: Point,
    end: Point,
};

type PathPoint = [string, Point];

type PathCmd = {
    d: Array<PathPoint>,
};

type TextCmd = {
    pos: Point,
    dest?: Point,
    lengthAdjust?: string,
    textLength?: string,
    text: string,
    fontSize?: string,
    attrs?: (ats: any) => any,
};

///////////////////////////////////////////////////////////////////////////////
// SVG
///////////////////////////////////////////////////////////////////////////////

class Branch {
    el: SVGElement
    children: Array<Branch>;
    constructor(tag: string, attrs?: object, children?: Array<Branch>) {
        this.el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (tag === 'svg') {
            this.el.setAttribute(
                'viewBox', 
                '0 0 100 50'
            );
            this.el.setAttribute(
                'xmlns',
                'http://www.w3.org/2000/svg'
            );
            // this.el.setAttribute(
            //     'preserveAspectRatio',
            //     "none"
            // );
        }
        for (const key in (attrs || {})) {
            const value = attrs[key];
            this.el.setAttribute(key, value);
        }
        for (const child of (children || [])) {
            this.append_child(child);
        }
    }
    append_child(child: Branch) {
        this.el.appendChild(child.el);
    }
    attr(key: string, value: string) {
        this.el.setAttribute(key, value);
    }
    circle(cmd: CircleCmd) {
        const attrs = {
            cx: cmd.pos.x,
            cy: cmd.pos.y,
            r: cmd.r,
        };
        const child = new Branch('circle', attrs, []);
        this.append_child(child);
        // return child;
    }
    line(cmd: LineCmd)  {
        const attrs = {
            x1: cmd.start.x,
            y1: cmd.start.y,
            x2: cmd.end.x,
            y2: cmd.end.y,
            stroke: 'black',
        };
        const child = new Branch('line', attrs, []);
        this.append_child(child);
    }
    path(cmd: PathCmd) {
        const attrs = {
            'd': $(() => {
                let path_data = "";
                for (const point of cmd.d) {
                    path_data += `${point[0]} ${point[1][0]},${point[1][1]} `;
                }
                return path_data;
            }),
        };
        const child = new Branch('path', attrs, []);
        this.append_child(child);
        // return child;
    }
    text(cmd: TextCmd) {
        let attrs = {} as any;
        attrs.x = cmd.pos.x;
        attrs.y = cmd.pos.y;
        if (cmd.attrs) {
            attrs = cmd.attrs(attrs);
        }
        if (cmd.dest) {
            attrs['dx'] = cmd.dest.x;
            attrs['dy'] = cmd.dest.y;
        }
        if (cmd.lengthAdjust) {
            attrs['lengthAdjust'] = cmd.lengthAdjust;
        }
        if (cmd.textLength) {
            attrs['textLength'] = cmd.textLength;
        }
        if (cmd.fontSize) {
            if (attrs['style']) {
                attrs['style'] += `font-size: ${cmd.fontSize};`;
            } else {
                attrs['style'] = `font-size: ${cmd.fontSize};`;
            }
        }
        const child = new Branch('text', attrs, []);
        child.el.innerHTML = cmd.text;
        this.append_child(child);
    }
}


///////////////////////////////////////////////////////////////////////////////
// MAIN
///////////////////////////////////////////////////////////////////////////////

function figure(root: Branch) {
    const point_a = point('10px', '90%');
    const point_b = point('60%', '10px');
    const point_c = point('90%', '90%');
    root.circle({
        pos: point_a,
        r: '2px',
    });
    root.circle({
        pos: point_b,
        r: '2px',
    });
    root.circle({
        pos: point_c,
        r: '2px',
    });
    root.line({
        start: point_a,
        end: point_b,
    });
    root.line({
        start: point_b,
        end: point_c,
    });
    root.line({
        start: point_c,
        end: point_a,
    });
    root.text({
        pos: point_b,
        text: 'B',
        fontSize: '10px',
    });
    root.text({
        pos: point_a,
        text: 'A',
        fontSize: '10px',
    });
    root.text({
        pos: point_c,
        text: 'C',
        fontSize: '10px',
    });
}

function view(): Branch {
    const root = new Branch('svg', {
        width: "200px",
        height: "100px",
    }, []);
    figure(root);
    return root;
}

window.onload = () => {
    // const svg = document.querySelector("svg#figure-4-1-1-proof") as SVG;
    // console.assert(canvas);
    // setup_canvas(canvas);
    const parent = document.querySelector('div#figure-4-1-1-proof-wrapper');
    console.assert(parent);
    parent.appendChild(view().el);
};


