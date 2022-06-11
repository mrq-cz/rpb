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
    

    const select = function(root, selector) {
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    };

    const loadSvg = url => fetch(url)
            .then(response => response.text())
            .then(raw => (new window.DOMParser()).parseFromString(raw, 'image/svg+xml'));

    async function load() {
        const svgs = await Promise.all(['./svgs/fist_1.svg'].map(loadSvg));
        const paths = svgs.map(root => select(root, 'path')).flat();
        const points = paths.map(path => {
            const pts = [];
            for (let i = 0; i < path.getTotalLength(); i = i + 4) {
                pts.push(path.getPointAtLength(i));
            }
            return pts;
        }).flat();

        const container = Composite.create();
        points.map(({x, y}, i) => {
            const target = Matter.Bodies.rectangle(40+2*i, 200, 1, 5, {
                render: {
                    strokeStyle: 'red',
                    fillStyle: 'black',
                    lineWidth: 2,
               },
                plugin: {
                    attractors: [
                        (bodyA, bodyB) => ({
                            x: (bodyA.position.x - bodyB.position.x) * 1e-10,
                            y: (bodyA.position.y - bodyB.position.y) * 1e-10,
                        })
                    ]
                }});
            Composite.add(container, Matter.Bodies.circle(x,y,0.1,{
                isStatic: true,
                render: {fillStyle: 'white'},
                collisionFilter: {mask: 0},
                plugin: {
                    attractors: [
                        (bodyA, bodyB) => ({
                            x: bodyB.id === target.id ? (bodyA.position.x - bodyB.position.x) * 1e-6 : null,
                            y: bodyB.id === target.id ? (bodyA.position.y - bodyB.position.y) * 1e-6 : null,
                        })
                    ]
                }
            }));
            Composite.add(container, target);
        });
        Composite.scale(container, 3, 3, Matter.Vector.create(0, 0));
        Composite.add(world, container);
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
