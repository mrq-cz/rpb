var Example = Example || {};

Example.svg = function() {
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

    engine.world.gravity.y = 0;
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
    }
    resizeBounds();
    window.addEventListener('resize', resizeBounds);

    // create runner
    const runner = Runner.create();
    Runner.run(runner, engine);


    const select = (root, selector) => Array.prototype.slice.call(root.querySelectorAll(selector));

    const loadSvg = svg => fetch('./svgs/'+svg)
            .then(response => response.text())
            .then(raw => (new window.DOMParser()).parseFromString(raw, 'image/svg+xml'));

    const loadPoints = async (svg, every = 4) => loadSvg(svg).then(root =>
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

    const anchorsFromPoints = points => {
        const anchors = Composite.create();
        points.map(point => {
            const anchor = createAnchor(point);
            Composite.add(anchors, anchor);
        });
        return anchors;
    }

    Eths = function (style, particle) {

        let cs = [];
        let target = -1;
        const ns = new Set();
        const ss = new Set();

        this.generateBody = ({x, y}) => {
            const n = Bodies.rectangle(x, y, 2, 2, {
                collisionFilter: {group: 1},
                render: {fillStyle: 'blue'},
                plugin: {
                    attractors: [
                        (bodyA, bodyB) => ss.has(bodyB.id) && bodyB.id !== s.id ? MatterAttractors.Attractors.gravity(bodyA, bodyB) : null,
                    ]
                }});
            ns.add(n.id);
            const c = Bodies.fromVertices(x+20, y, particle, {
                render: {
                    fillStyle: 'white',
                    strokeStyle: 'black',
                    lineWidth: 1
            }});
            const s = Bodies.rectangle(x+40, y, 2, 2, {
                collisionFilter: {group: 2},
                render: {fillStyle: 'red'},
                plugin: {
                    attractors: [
                        (bodyA, bodyB) => ns.has(bodyB.id) && bodyB.id !== n.id ? MatterAttractors.Attractors.gravity(bodyA, bodyB) : null,
                    ]
                }});
            ss.add(s.id);
            const nc = Matter.Constraint.create({bodyA: n, bodyB: c, pointB: {x: -5, y: 0}, length: 3, stiffness: 0.3, render: {visible: false}});
            const sc = Matter.Constraint.create({bodyA: s, bodyB: c, pointB: {x: 5, y: 0}, length: 3, stiffness: 0.3, render: {visible: false}});
            cs.push({body: c});
            Composite.add(world, [c]);
            Composite.add(world, [n, s]);
            Composite.add(world, [nc, sc]);
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
    }

    const svgToVertices = svg => {
        const paths = select(svg, 'path');
        return paths.map(path => Vertices.scale(Svg.pathToVertices(path, 2), 0.420, 0.420));
    }

    async function load() {
        const particleVerticle = svgToVertices(await loadSvg('vobrys.svg'));

        const White = new Eths('white', particleVerticle);
        const Red = new Eths('red', particleVerticle);

        const points = await loadPoints('scissors.svg');
        const anchors = anchorsFromPoints(points);

        Composite.scale(anchors, 3, 3, Matter.Vector.create(0, 0));
        Composite.add(world, anchors);

        White.generateBody({x: 30, y: 100});

        anchors.bodies.map((anchor, i) => {
            const offset = 40+10*i;

            White.generateBody({x: offset, y: 100});
            White.anchorBody(anchor);
        });

        const middle = createAnchor({x: 200, y: 200});
        Composite.add(world, middle);
        for (let i = 0; i < 500; i++) {
            White.anchorBody(middle);
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

Example.svg.title = 'Concave SVG Paths';
Example.svg.for = '>0.16.1';

if (typeof module !== 'undefined') {
    module.exports = Example.svg;
}
