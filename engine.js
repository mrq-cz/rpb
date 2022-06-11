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

    const loadSvg = url => fetch(url)
            .then(response => response.text())
            .then(raw => (new window.DOMParser()).parseFromString(raw, 'image/svg+xml'));     

    const loadPoints = async svg => loadSvg('./svgs/'+svg).then(root =>
        select(root, 'path')
            .flat()
            .map(path => {
                const pts = [];
                for (let i = 0; i < path.getTotalLength(); i = i + 4) {
                    pts.push(path.getPointAtLength(i));
                }
                return pts;
            }).flat());

    const anchorsFromPoints = points => {
        const anchors = Composite.create();
        points.map(({x, y}) => {
            const anchor = Matter.Bodies.circle(x,y,1,{
                isStatic: true,
                render: {fillStyle: 'grey', visible: false},
                collisionFilter: {mask: 0}
            });
            Composite.add(anchors, anchor);
        });
        return anchors;
    }

    async function load() {
        const points = await loadPoints('scissors.svg');
        const anchors = anchorsFromPoints(points);

        Composite.scale(anchors, 3, 3, Matter.Vector.create(0, 0));
        Composite.add(world, anchors);

        const ns = new Set();
        const ss = new Set();
        anchors.bodies.map(({position:{x, y}}, i) => {
            const offset = 40+10*i;
            const n = Bodies.rectangle(offset, 100, 2, 2, {
                collisionFilter: {group: 1},
                render: {fillStyle: 'blue'},
                plugin: {
                    attractors: [
                        (bodyA, bodyB) => ss.has(bodyB.id) && bodyB.id !== s.id ? MatterAttractors.Attractors.gravity(bodyA, bodyB) : null,
                    ]
                }});
            ns.add(n.id);
            const c = Bodies.rectangle(offset+20, 100, 12, 3, {
                render: {fillStyle: 'white'}
            });
            const s = Bodies.rectangle(offset+40, 100, 2, 2, {
                collisionFilter: {group: 2},
                render: {fillStyle: 'red'},
                plugin: {
                    attractors: [
                        (bodyA, bodyB) => ns.has(bodyB.id) && bodyB.id !== n.id ? MatterAttractors.Attractors.gravity(bodyA, bodyB) : null,
                    ]
                }});
            sid = s.id;
            ss.add(s.id);
            const nc = Matter.Constraint.create({bodyA: n, bodyB: c, pointB: {x: -5, y: 0}, length: 3, stiffness: 0.3, render: {visible: false}});
            const sc = Matter.Constraint.create({bodyA: s, bodyB: c, pointB: {x: 5, y: 0}, length: 3, stiffness: 0.3, render: {visible: false}});

            const link = Matter.Constraint.create({pointA: {x,y}, bodyB: c, length: 0, damping: 1, stiffness: 0.05, render: {visible: false}});

            Composite.add(world, [c]);
            Composite.add(world, [n, s]);
            Composite.add(world, [nc, sc]);
            Composite.add(world, link);
        });
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
