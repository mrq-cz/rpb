var RPB = RPB || {};

RPB.svg = function() {
    Matter.use(MatterAttractors);

    const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Common = Matter.Common,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        Composite = Matter.Composite,
        Vertices = Matter.Vertices,
        Svg = Matter.Svg,
        Bodies = Matter.Bodies;

    // provide concave decomposition support library
    Common.setDecomp(window.decomp);

    // create engine
    const engine = Engine.create(),
        world = engine.world;

    const defaultGravity = 20;
    engine.world.gravity.y = defaultGravity;
    engine.timing.timeScale = engine.timing.timeScale / 5;
    MatterAttractors.Attractors.gravityConstant = 0.1;

    // create renderer
    const render = Render.create({
        element: document.body,
        engine,
        options: {
            wireframes: false,
            background: 'black'
        }
    });

    Render.run(render);

    // handle resize
    function resizeBounds() {
        render.bounds.max.x = window.innerWidth;
        render.bounds.max.y = window.innerHeight;
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        Render.lookAt(render, {
            min: { x: 0, y: 0 },
            max: { x: 800, y: 600 }
        });
    }
    resizeBounds();
    window.addEventListener('resize', resizeBounds);

    // create runner
    const runner = Runner.create();
    Runner.run(runner, engine);

    const wait = async time => new Promise(resolve => setTimeout(resolve, time));

    const select = (root, selector) => Array.prototype.slice.call(root.querySelectorAll(selector));

    const loadSvg = svg => fetch('./svgs/'+svg)
            .then(response => response.text())
            .then(raw => (new window.DOMParser()).parseFromString(raw, 'image/svg+xml'));

    const loadPoints = async (svg, every = 6) => loadSvg(svg).then(root =>
        select(root, 'path')
            .flat()
            .map(path => {
                const pts = [];
                for (let i = 0; i < path.getTotalLength(); i = i + every) {
                    pts.push(path.getPointAtLength(i));
                }
                return pts;
            }).flat());

    const createAnchor = ({x,y}) => Matter.Bodies.circle(x,y,1,{
        isStatic: true,
        render: {fillStyle: 'grey', visible: false},
        collisionFilter: {mask: 0}
    });

    const anchorsFromPoints = (points, scale = 3) => {
        const anchors = Composite.create();
        points.map(point => {
            const anchor = createAnchor(point);
            Composite.add(anchors, anchor);
        });
        Composite.scale(anchors, scale, scale, Matter.Vector.create(0, 0));
        return anchors;
    }

    Eths = function (style, particle, scale = 0.44) {

        let cs = [];
        let target = -1;
        const ns = new Set();
        const ss = new Set();

        this.generateBody = ({x, y}) => {
            const svgPath = `./svgs/${style}.svg`;
            const c = Bodies.fromVertices(x+20, y, particle, {
                render: {
                    fillStyle: style,
                    lineWidth: 1, 
                    sprite: {
                        texture: svgPath,
                        yOffset: -0.013,
                        xOffset: -0.00013,
                        xScale: scale,
                        yScale: scale
                    }
            }});
            cs.push({body: c});
            Composite.add(world, [c]);
            return c;
        }

        this.anchorBody = (anchor, {damping = 1, stiffness = 0.05} = {}) => {
            target = (target + 1) % cs.length;
            const body = cs[target];
            if (body.link) {
                Composite.remove(world, body.link);
            }
            const link = Matter.Constraint.create({bodyA: anchor, bodyB: body.body, length: 0, damping, stiffness, render: {visible: false}});
            body.link = link;
            Composite.add(world, link);
        }

        this.anchorPoints = anchors => {
            anchors.bodies.map(a => this.anchorBody(a));
        }

        this.anchorAll = anchor => {
            cs.forEach(() => this.anchorBody(anchor));
        }

        this.freeAll = () => {
            cs.forEach(body => {
                if (body.link) {
                    Composite.remove(world, body.link);
                }
                body.link = null;
            });
        }
    }

    const svgToVertices = (svg, scale = 0.66) => {
        const paths = select(svg, 'path');
        return paths.map(path => Vertices.scale(Svg.pathToVertices(path, 2), scale, scale));
    }

    async function load() {
        const left = createAnchor({x: -200, y: 200});
        const right = createAnchor({x: 1000, y: 200});
        const bottom = createAnchor({x: 400, y: 800});
        const superbottom = createAnchor({x: 400, y: 8000000});
        Composite.add(world, left);
        Composite.add(world, right);
        Composite.add(world, bottom);
        Composite.add(world, superbottom);

        const particleVerticle = svgToVertices(await loadSvg('vobrys.svg'));
        const White = new Eths('eth_violet', particleVerticle);
        const Red = new Eths('eth_green', particleVerticle);
        const Bordel = new Eths('eth_red', particleVerticle, 0.5);

        const paper = anchorsFromPoints(await loadPoints('paper_4f.svg'));
        Composite.rotate(paper, Math.PI / 2, {x: 200, y:200});
        Composite.translate(paper, {x:150, y:-50})

        const stone = anchorsFromPoints(await loadPoints('fist_1.svg'));
        Composite.rotate(stone, Math.PI / 2, {x: 200, y:200});
        Composite.translate(stone, {x:200, y:0})

        const scissors = anchorsFromPoints(await loadPoints('scissors.svg'));
        Composite.rotate(scissors, -(Math.PI / 2), {x: 200, y:200});
        Composite.rotate(scissors, -(Math.PI / 7), {x: 200, y:200});
        Composite.translate(scissors, {x:400, y:280})

        const redstone = anchorsFromPoints(await loadPoints('fist_1.svg'));
        Composite.rotate(redstone, -(Math.PI / 2), {x: 200, y:200});
        Composite.translate(redstone, {x:300, y:200})

        const bordel = anchorsFromPoints(await loadPoints('bordel.svg'), 3.5);
        Composite.translate(bordel, {x:0, y:-300})

        Composite.add(world, [stone, scissors, paper, redstone, bordel]);

        for (let i = 0; i < paper.bodies.length; i++) {
            White.generateBody({x: -200-i*10, y: 200});
            White.anchorBody(left);
        }

        for (let i = 0; i < paper.bodies.length; i++) {
            Red.generateBody({x: 1000+i*10, y: 200});
            Red.anchorBody(right);
        }

        for (let i = 0; i < bordel.bodies.length; i++) {
            Bordel.generateBody({x: 1000+i*10, y: 200});
            Bordel.anchorBody(superbottom);
        }

        await wait(500);

        let repeat = false;

        document.addEventListener("keydown", async ({key}) => {
            if (key === 'b') {
                Bordel.anchorPoints(bordel);
                await wait(500);
                Bordel.freeAll();
            }
        });

        for (;;) {
            White.anchorAll(bottom);
            Red.anchorAll(bottom);
            await wait(1000);
            White.freeAll();
            Red.freeAll();
            engine.world.gravity.y = -1;
            engine.world.gravity.x = 0;
            if (repeat) {
                await wait(2000);
                Bordel.anchorPoints(bordel);
            }

            await wait(5000);
            engine.world.gravity.y = defaultGravity;
            engine.world.gravity.x = 0;
            Bordel.freeAll();
            White.anchorAll(left);
            Red.anchorAll(right);
            await wait(5000);

            // stone v scissors
            White.anchorPoints(stone);
            await wait(500);
            Red.anchorPoints(scissors);
            await wait(4000);
            Red.freeAll();
            Composite.translate(stone, {x: 600, y: 0});
            await wait(500);
            Composite.translate(stone, {x: -600, y: 0});

            await wait(5000);

            // paper v scissor
            White.anchorPoints(paper);
            await wait(500);
            Red.anchorPoints(scissors);
            await wait(4000);
            Composite.translate(scissors, {x: -600, y: 400});
            White.freeAll();
            await wait(500);
            Composite.translate(scissors, {x: 600, y: -400});

            await wait(5000);

            // paper v stone
            Red.anchorAll(right);
            White.anchorAll(left);
            await wait(200);
            Red.anchorPoints(redstone);
            await wait(1000);
            White.anchorPoints(paper);
            await wait(4000);
            Composite.translate(paper, {x: -200, y: 0});
            await wait(1000);
            Red.freeAll();
            engine.world.gravity.y = 5;
            engine.world.gravity.x = -30;
            Composite.translate(paper, {x: 200, y: 0});

            // reset
            await wait(1500);
            engine.world.gravity.y = defaultGravity;
            engine.world.gravity.x = 0;
            await wait(1500);

            White.anchorAll(left);
            Red.anchorAll(right);
            await wait(3000);
            repeat = true;
            Bordel.anchorAll(superbottom);
        }
    }

    load();

    // add mouse control
    var mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });

    Composite.add(world, mouseConstraint);

    // keep the mouse in sync with rendering
    render.mouse = mouse;

    // fit the render viewport to the scene
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: 800, y: 600 }
    });

    // context for MatterTools.Demo
    return {
        engine: engine,
        runner: runner,
        render: render,
        canvas: render.canvas,
        stop: function() {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
        }
    };
};

RPB.svg.title = 'Concave SVG Paths';
RPB.svg.for = '>0.16.1';

if (typeof module !== 'undefined') {
    module.exports = RPB.svg;
}
