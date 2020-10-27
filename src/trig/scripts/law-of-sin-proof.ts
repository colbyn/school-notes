function $<T>(f: () => T): T {
    return f();
}

function setup_canvas(canvas: HTMLCanvasElement) {
    // Get the device pixel ratio, falling back to 1.
    var dpr = window.devicePixelRatio || 1;
    // Get the size of the canvas in CSS pixels.
    var rect = canvas.getBoundingClientRect();
    // Give the canvas pixel dimensions of their CSS
    // size * the device pixel ratio.
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    ctx.scale(dpr, dpr);
    return ctx;
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

type Cartesian2D = {
    x: number,
    y: number,
};

function point(x: number, y: number): Cartesian2D {
    return {x, y}
}

type DrawPointCmd = {
    point: Cartesian2D,
    r: number
    apply?: (ctx: CanvasRenderingContext2D) => void,
};

function draw_point(canvas: HTMLCanvasElement, cmd: DrawPointCmd) {
    const ctx = canvas.getContext('2d');
    const {x, y} = to_screen_cordinates(canvas, {
        x: cmd.point.x,
        y: cmd.point.y,
    });
    ctx.moveTo(0, 0);
    ctx.beginPath();
    ctx.arc(x, y, cmd.r, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#000';
    ctx.fill();
    if (cmd.apply) {
        cmd.apply(ctx);
    }
    ctx.stroke();
    ctx.restore();
}

type DrawLinesCmd = {
    points: Array<Cartesian2D>,
    apply?: (ctx: CanvasRenderingContext2D) => void,
};

function draw_lines(canvas: HTMLCanvasElement, cmd: DrawLinesCmd) {
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.save();
    cmd.points.forEach((point, ix) => {
        const {x, y} = to_screen_cordinates(canvas, point);
        if (ix === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    if (cmd.apply) {
        cmd.apply(ctx);
    }
    ctx.stroke();
    ctx.restore();
}

type DrawLabelCmd = {
    point: Cartesian2D,
    text: string
    apply?: (ctx: CanvasRenderingContext2D) => void,
};

function draw_label(canvas: HTMLCanvasElement, cmd: DrawLabelCmd) {
    const ctx = canvas.getContext('2d');
    const {x, y} = to_screen_cordinates(canvas, {
        x: cmd.point.x,
        y: cmd.point.y,
    });
    ctx.moveTo(0, 0);
    ctx.save();
    if (cmd.apply) {
        cmd.apply(ctx);
    }
    ctx.fillText(cmd.text, x, y);
    ctx.restore();
}

type DrawOverBraceCmd = {
    start: Cartesian2D,
    end: Cartesian2D,
    // apply?: (ctx: CanvasRenderingContext2D) => void,
};

function draw_over_brace(canvas: HTMLCanvasElement, cmd: DrawOverBraceCmd) {
    const ctx = canvas.getContext('2d');
    const text = '⏞';
    const text_width = ctx.measureText(text).width;
    const start = to_screen_cordinates(canvas, cmd.start);
    const end = to_screen_cordinates(canvas, cmd.end);
    const mid = $(() => {
        const x = (start.x + end.x) / 2;
        const y = (start.x + end.x) / 2;
        return {x, y};
    });
    const distance = $(() => {
        return Math.sqrt(((end.x - start.x) ** 2) + ((end.y - start.y) ** 2))
    });
    const angle_radians = $(() => {
        const p1 = start;
        const p2 = end;
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    });
    ctx.moveTo(0, 0);
    ctx.save();
    ctx.beginPath();

    
    const res = $(() => {
        // ctx.rotate(angle_radians);
        var text_canvas = document.createElement('canvas');
        text_canvas.width = distance;
        $(() => {
            const embed_ctx = text_canvas.getContext('2d');
            embed_ctx.font = `${distance}px Computer Modern`;
            embed_ctx.textAlign = 'left';
            embed_ctx.textBaseline = 'middle';
            embed_ctx.fillText(text, 1, 0);
        });
        
        ctx.rotate(angle_radians);
        // ctx.translate(-(distance / 2), -(distance / 2));
        ctx.scale(0.5, 0.5);
        // ctx.drawImage(text_canvas, start.x, start.y, distance, 50);



        // ctx.font = `${distance}px Computer Modern`;
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        // ctx.scale(1, 0.8);
        // ctx.translate(6, -50);
        // ctx.fillText(text, start.x, start.y);

        // ctx.font = `${distance}px Computer Modern`;
        // ctx.textAlign = 'left';
        // ctx.textBaseline = 'middle';
        // // ctx.scale(1, 0.8);
        // // ctx.translate(6, -50);
        // ctx.fillText(text, 0, 0);
    });

    console.log("done: A ");

    ctx.stroke();
    ctx.restore();
}


function draw_figure(canvas: HTMLCanvasElement) {
    const max_top = 70;
    const max_bot = 80;
    const point_x = point(-max_bot, -max_bot);
    const point_y = point(20, max_top);
    const point_z = point(max_bot, -max_bot);
    const point_y_bot = point(point_y.x, -max_bot);
    const point_y_mid = point(point_y.x, 0);
    ///////////////////////////////////////////////////////////////////////////
    // LINES
    ///////////////////////////////////////////////////////////////////////////
    draw_lines(canvas, {
        points: [
            point_y,
            point_y_bot,
        ],
        apply: (ctx: CanvasRenderingContext2D) => {
            ctx.lineWidth = 1;
            ctx.fillStyle = "#7d7d7d;"
            ctx.setLineDash([5]);
        },
    });
    draw_lines(canvas, {
        points: [
            point_x,
            point_y,
            point_z,
            point_x,
            point_y,
        ],
        apply: (ctx: CanvasRenderingContext2D) => {
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
        },
    });
    ///////////////////////////////////////////////////////////////////////////
    // LABELS
    ///////////////////////////////////////////////////////////////////////////
    const draw_label_apply = (
            ha_pos: CanvasTextAlign, 
            va_pos: CanvasTextBaseline) => (ctx: CanvasRenderingContext2D) => {
        ctx.textAlign = ha_pos;
        ctx.textBaseline = va_pos;
        ctx.fillStyle = "#000";
        ctx.font = '16px Source Sans Pro'
    };
    draw_label(canvas, {
        point: point_x,
        text: 'A',
        apply: draw_label_apply('right', 'top'),
    });
    draw_label(canvas, {
        point: point_y,
        text: 'B',
        apply: draw_label_apply('center', 'bottom'),
    });
    draw_label(canvas, {
        point: point_z,
        text: 'C',
        apply: draw_label_apply('left', 'top'),
    });
    draw_label(canvas, {
        point: point(
            point_y_mid.x + 2,
            point_y_mid.y,
        ),
        text: 'h',
        apply: draw_label_apply('left', 'middle'),
    });
    draw_over_brace(canvas, {
        start: point_x,
        end: point_y,
    });
}

window.onload = () => {
    const canvas = document.querySelector("canvas#figure-4-1-1-proof") as HTMLCanvasElement;
    console.assert(canvas);
    setup_canvas(canvas);
    draw_figure(canvas);
};


