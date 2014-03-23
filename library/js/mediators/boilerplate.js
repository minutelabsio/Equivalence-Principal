define(
    [
        'require',
        'plugins/domready',
        'moddef',
        'hammer',
        'physicsjs',
        'modules/multicanvas-renderer'
    ],
    function(
        require,
        domReady,
        M,
        hammer,
        Physics,
        _mcr
    ) {

        'use strict';

        var MPColors = [
            'rgb(18, 84, 151)' // blue-dark
            // ,'rgb(0, 37, 143)' // deep-blue-dark
            ,'rgb(167, 42, 34)' // red-dark
            // ,'rgb(151, 52, 29)' // red-orange-dark
            ,'rgb(159, 80, 31)' // orange-dark
            ,'rgb(64, 128, 0)' // green-dark
            ,'rgb(139, 129, 23)' // yellow-dark
        ];

        function logerr( err ){
            window.console.error( err );
        }

        // VERY crude approximation to a gaussian random number.. but fast
        var gauss = function gauss( mean, stddev ){
            var r = 2 * (Math.random() + Math.random() + Math.random()) - 3;
            return r * stddev + mean;
        };

        function sign( n ){
            return n >= 0 ? 1 : -1;
        }

        function pad(num, size) {
            var s = '000000000' + num;
            return s.substr(s.length - size);
        }

        /**
         * Page-level Mediator
         * @module Boilerplate
         * @implements {Stapes}
         */
        var Mediator = M({

            /**
             * Mediator Constructor
             * @return {void}
             */
            constructor : function(){

                var self = this;

                self.scale = 0.5;
                self.minScale = 0.05;
                self.maxScale = 1;

                self.initEvents();

                domReady(function(){
                    self.onDomReady();
                    self.resolve('domready');
                });
            },

            /**
             * Initialize events
             * @return {void}
             */
            initEvents : function(){

                var self = this;

                function scaleEvent(){
                    self.scale = Math.max(self.minScale, Math.min(self.maxScale, self.scale));
                    self.emit('scale', self.scale);
                }

                self.after('domready', function(){

                    var hammertime = hammer( document.getElementById('physics') );
                    hammertime.on('mousewheel', function( e ) { 
                        var zoom = Math.min(Math.abs(e.wheelDelta) / 50, 0.2) * sign(e.wheelDelta);
                        self.scale *= Math.pow(2, zoom);
                        scaleEvent();
                        e.preventDefault();
                    });

                    hammertime.on('touch', function( e ){

                        self.emit('touch', e);
                    });

                    hammertime.on('drag', function( e ){
                        self.emit('drag', e);
                    });

                    hammertime.on('release', function( e ){

                        self.emit('release', e);
                    });
                });
            },

            initPhysics: function( world ){

                var self = this
                    ,i
                    ,l
                    ,viewWidth = window.innerWidth
                    ,viewHeight = window.innerHeight
                    ,sightRadius = Math.max( viewWidth, viewHeight ) * 0.5 * ( Math.sqrt(2) )
                    ,renderer = Physics.renderer('multicanvas', {
                        el: 'physics',
                        width: viewWidth,
                        height: viewHeight,
                        // meta: true,
                        // debug:true,
                        styles: {
                            'circle': {
                                strokeStyle: '#1a1a1a',
                                lineWidth: 0,
                                fillStyle: '#1a1a1a',
                                angleIndicator: 'rgba(0,0,0,0)'
                            }
                        }
                    })
                    // bounds of the window
                    ,viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight)
                    ;

                this.world = world;
                this.renderer = renderer;
                
                // add the renderer
                world.add(renderer);

                // render on each step
                world.on('step', function () {
                    world.render();
                });
                
                // resize events
                window.addEventListener('resize', function () {
            
                    viewWidth = window.innerWidth;
                    viewHeight = window.innerHeight;
            
                    renderer.resize( viewWidth, viewHeight );
                    sightRadius = Math.max( viewWidth, viewHeight ) * 0.5;
            
                    viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight);
            
                }, true);
                
                // subscribe to ticker to advance the simulation
                Physics.util.ticker.on(function (time, dt) {
            
                    world.step(time);
                });
            
                // start the ticker
                Physics.util.ticker.start();

                var sheep = [];

                for ( i = 0, l = 5; i < l; ++i ){
                    
                    sheep.push(Physics.body('circle', {
                        x: Math.random() * viewWidth
                        ,y: Math.random() * viewHeight
                        // ,vx: Math.random() * 0.1
                        ,radius: 12
                        ,classed: 'sheep'
                        ,styles: {
                            src: require.toUrl( '../../images/Sheep.png' )
                        }
                    }));
                }

                world.add([
                    Physics.behavior('body-collision-detection').applyTo( sheep ),
                    Physics.behavior('sweep-prune'),
                    Physics.behavior('body-impulse-response')
                ]);

                var spaceCamBody = Physics.body('point', {
                    x: viewWidth * 0.5
                    ,y: viewHeight * 0.5
                    ,treatment: 'kinematic'
                });

                var parallaxBody = Physics.body('point', {
                    x: viewWidth * 0.5
                    ,y: viewHeight * 0.5
                    ,treatment: 'kinematic'
                });

                world.add([
                    spaceCamBody 
                    ,parallaxBody
                ]);

                // rocket
                var rocket = self.addRocket(viewWidth * 0.5, viewHeight * 0.5);

                renderer.layers.main
                    .addToStack( sheep )
                    // .addToStack( rocket.gravometer )
                    .options({ 
                        follow: spaceCamBody
                        ,scale: self.scale
                        ,offset: Physics.vector(viewWidth * 0.5, viewHeight * 0.5) 
                    })
                    ;

                // rocket rendering
                var rocketLayer = renderer.addLayer('rocket', null, {
                    follow: spaceCamBody
                    ,scale: self.scale
                    ,offset: Physics.vector(viewWidth * 0.5, viewHeight * 0.5)
                });
                rocketLayer.render = function(){

                    var ctx = rocketLayer.ctx
                        ,aabb = rocket.aabb
                        ,scratch = Physics.scratchpad()
                        ,offset = scratch.vector().set(0, 0)
                        ,scale = rocketLayer.options.scale
                        ;

                    if ( rocketLayer.options.offset ){
                        offset.vadd( rocketLayer.options.offset ).mult( 1/scale );
                    }

                    if ( rocketLayer.options.follow ){
                        offset.vsub( rocketLayer.options.follow.state.pos );
                    }

                    ctx.clearRect(0, 0, rocketLayer.el.width, rocketLayer.el.height);
                    ctx.save();
                    ctx.scale( scale, scale );
                    rocket.drawTo(aabb._pos.get(0) + offset.get(0), aabb._pos.get(1) + offset.get(1), ctx, renderer);
                    ctx.restore();
                    scratch.done();
                };

                var drag = false
                    ,thrust = false
                    ,orig = Physics.vector()
                    ,movePos = Physics.vector()
                    ,throttleTime = 1000 / 60 | 0
                    ;

                self.on('touch', function( ev, e ){
                    var pos = e.gesture.center;
                    pos.x = pos.pageX;
                    pos.y = pos.pageY;
                    orig.clone( pos ).sub( viewWidth/2, viewHeight/2 ).mult( 1 / self.scale ).vadd( spaceCamBody.state.pos );

                    if ( rocket.outerAABB.contains( orig ) ){

                        drag = true;
                        orig.clone( rocket.pos );
                        movePos.clone( orig );

                    } else {
                        thrust = true;
                    }
                });

                self.on('drag', Physics.util.throttle(function(ev, e){
                    var pos = e.gesture.center;
                    pos.x = pos.pageX;
                    pos.y = pos.pageY;
                    
                    if ( drag ){

                        movePos
                            .clone( orig )
                            .add( e.gesture.deltaX / self.scale, e.gesture.deltaY / self.scale )
                            ;
                    }

                }, throttleTime));

                self.on('release', function( ev, e){
                    drag = false;
                    // rocket.edge.body.state.vel.zero();
                    thrust = false;
                });

                self.on('scale', function( ev, scale ){
                    renderer.layers.main.options({ scale: scale });
                    rocketLayer.options({ scale: scale });
                });

                document.getElementById('catch-up').addEventListener('mousedown', function( e ){
                    var scale = 0.1;
                    var diff = Physics.vector().clone( rocket.pos ).vsub( spaceCamBody.state.pos );
                    spaceCamBody.state.pos.vadd( diff );
                    spaceCamBody.state.vel.clone( rocket.edge.body.state.vel );
                    parallaxBody.state.pos.vadd( diff.mult( scale ) );
                    parallaxBody.state.vel.clone( rocket.edge.body.state.vel ).mult( scale );
                    document.getElementById('out-of-sight').style.display = 'none';
                });

                function debrisField( body, radius, noclean ){

                    noclean = noclean || [];
                    var debris = [];
                    var maxDebris = 10;

                    function createDebris( x, y ){

                        if ( debris.length >= maxDebris ){
                            return;
                        }

                        var scratch = Physics.scratchpad()
                            ,r = scratch.vector()
                            ;

                        if ( x || y ){
                            r.set( x, y );
                        } else {
                            r.clone( body.state.vel )
                                .add(0, -1e-6)
                                .normalize()
                                .mult( sightRadius + 500 * Math.random() )
                                .add( body.state.pos.get(0) + 2 * (Math.random() - 0.5) * radius, body.state.pos.get(1) )
                                ;
                        }
                        
                        var d = Physics.body('convex-polygon', {
                            x: r.get(0)
                            ,y: r.get(1)
                            ,vertices: [
                                { x: 0, y: 0 }
                                ,{ x: 4, y: 10 }
                                ,{ x: 15, y: 8 }
                                ,{ x: 15, y: 0 }
                            ]
                            ,vx: (Math.random() - 0.5) * 0.01
                            ,vy: (Math.random() - 0.5) * 0.01
                            ,angularVelocity: Math.random() * 0.001
                            ,styles: 'grey'
                        });

                        debris.push( d );
                        world.add( d );
                        renderer.layers.main.addToStack( d );
                        renderer.layers[ 'rocket-cam' ].addToStack( d );
                        scratch.done();
                    };

                    for ( i = 0, l = maxDebris; i < l; ++i ){
                        
                        createDebris( viewWidth * Math.random(), viewHeight * Math.random(), spaceCamBody );
                    }

                    function removeDebris( i ){
                        var d = debris.splice( i, 1 )[0];
                        if ( d ){
                            renderer.layers.main.removeFromStack( d );
                            renderer.layers[ 'rocket-cam' ].removeFromStack( d );
                            world.remove( d );
                        }
                    }

                    // clean up debris
                    var aabb = Physics.aabb();
                    function cleanDebris(){
                        var d, i, l, rm, nc;
                        for ( i = 0, l = debris.length; i < l; ++i ){
                            rm = true;
                            d = debris[ i ];

                            for ( var j = 0, ll = noclean.length; j < ll; ++j ){
                                
                                nc = noclean[ j ];
                                aabb.set( nc );
                                if ( aabb.contains( d.state.pos ) ){
                                    rm = false;
                                    break;
                                }
                            }

                            if ( d.state.pos.dist( body.state.pos ) < radius ){
                                rm = false;
                            }

                            if ( rm ){
                                removeDebris( i );
                                i--;
                                l--;
                            }
                        }
                    }

                    setInterval(function(){
                        cleanDebris();
                        for ( var i = 0, l = maxDebris - debris.length; i < l; ++i ){
                            
                            createDebris();
                        }
                    }, 400);
                }

                // show rocket out of sight message if needed
                // setInterval(function(){
                //     if ( rocket.pos.dist( spaceCamBody.state.pos ) > sightRadius ){
                //         document.getElementById('out-of-sight').style.display = 'block';
                //     }
                // }, 1000);

                world.on('integrate:positions', function( data ){

                    rocket.moveTo( rocket.pos );
                    
                    if ( thrust ){
                        rocket.edge.body.state.acc.set(0, -0.0001);
                    } else if ( drag ) {
                        rocket.edge.body.state.vel.clone( movePos ).vsub( rocket.pos ).mult( 1/throttleTime ).vadd( spaceCamBody.state.vel );
                        movePos.vadd( spaceCamBody.state.vel.mult( data.dt ) );
                        orig.vsub( spaceCamBody.state.vel );
                        spaceCamBody.state.vel.mult( 1/data.dt )
                    }

                    // var scratch = Physics.scratchpad()
                    //     ,v = scratch.vector()
                    //     ;

                    // dampen the gravometer motion
                    // v.clone( rocket.gravometer.state.pos ).vsub( rocket.gravometer.state.old.pos );
                    // v.mult(1e-1 );
                    // rocket.gravometer.state.pos.vsub( v );
                    // rocket.gravometer.state.vel.mult( 0.9999 );

                    // scratch.done();
                });

                // explicitly add the edge behavior body to the world
                rocket.edge.body.treatment = 'kinematic';
                world.add([ 
                    rocket.edge.body
                    // ,rocket.gravometer
                    ,rocket.constr
                ]);

                rocket.edge.applyTo( sheep );
                world.add( sheep );
                world.add( rocket.edge );


                var rocketCam = renderer.addLayer('rocket-cam', null, {
                    width: 400
                    ,height: 400
                    ,autoResize: false
                    ,follow: rocket.edge.body
                    ,offset: Physics.vector(200, 200)
                });

                var oldRender = rocketCam.render;
                rocketCam.render = function(){

                    var ctx = rocketCam.ctx
                        ,aabb = rocket.aabb
                        ;

                    ctx.clearRect(0, 0, rocketCam.el.width, rocketCam.el.height);
                    rocket.drawTo(200, 200, ctx, renderer);
                    oldRender( false );
                };

                rocketCam
                    .addToStack( sheep )
                    // .addToStack( rocket.gravometer )
                    ;

                // debrisField( spaceCamBody, sightRadius, [{ pos: rocket.edge.body.state.pos, halfWidth: 400, halfHeight: 400 }] );
                // debrisField( rocket.edge.body, 400, [{ pos: spaceCamBody.state.pos, halfWidth: sightRadius, halfHeight: sightRadius }] );
                
                // periodic boundary
                
                world.on('step', function(){
                    var inv2scale = 0.5 / self.scale;
                    var bounds = {
                        minX: -viewWidth * inv2scale + rocketLayer.options.offset.get(0) - 120
                        ,maxX: viewWidth * inv2scale + rocketLayer.options.offset.get(0) + 120
                        ,minY: -viewHeight * inv2scale + rocketLayer.options.offset.get(1) - 340
                        ,maxY: viewHeight * inv2scale + rocketLayer.options.offset.get(1) + 340
                    };
                    var x = rocket.pos.get(0)
                        ,y = rocket.pos.get(1)
                        ,scratch = Physics.scratchpad()
                        ,dr = scratch.vector().set(0, 0)
                        ;

                    if ( x <= bounds.minX ){
                        dr.add( bounds.maxX - bounds.minX, 0 );
                    } else if ( x > bounds.maxX ){
                        dr.sub( bounds.maxX - bounds.minX, 0 );
                    }

                    if ( y <= bounds.minY ){
                        dr.add( 0, bounds.maxY - bounds.minY );
                    } else if ( y > bounds.maxY ){
                        dr.sub( 0, bounds.maxY - bounds.minY );
                    }

                    if ( !dr.equals( Physics.vector.zero ) ){

                        rocket.pos.vadd( dr );
                        rocket.edge.body.state.old.pos.vadd( dr );
                        rocket.moveTo( rocket.pos );
                        for ( var i = 0, l = sheep.length; i < l; ++i ){
                            
                            sheep[ i ].state.pos.vadd( dr );
                            sheep[ i ].state.old.pos.vadd( dr );
                        }
                    }

                    scratch.done();
                });
            },

            addRocket: function( x, y ){

                var aabb = Physics.aabb({
                        pos: {
                            x: x
                            ,y: y
                        }
                        ,halfWidth: 50
                        ,halfHeight: 100
                    })
                    ,edge = Physics.behavior('edge-collision-detection', {
                        aabb: aabb
                        ,restitution: 0.4
                        ,cof: 0.8
                    }).applyTo([])
                    ,anchor = Physics.body('point', {
                        treatment: 'static'
                    })
                    ,gravometer = Physics.body('circle', {
                        x: x
                        ,y: y - 120
                        ,radius: 5
                        ,styles: 'red'
                    })
                    ,constr = Physics.behavior('verlet-constraints')
                    ,rocketStyles = {
                        lineWidth: 0
                        ,strokeStyle: 'black'
                        ,fillStyle: 'rgba(200, 200, 200, 1)'
                    }
                    ,outerAABB = Physics.aabb(0, 0, 243, 663)
                    ,rocketImg = new Image()
                    ;

                rocketImg.src = require.toUrl('../../images/Rocket.png');

                var ret = {
                    aabb: aabb
                    ,outerAABB: outerAABB
                    ,edge: edge
                    ,pos: edge.body.state.pos
                    ,anchor: anchor
                    ,gravometer: gravometer
                    ,constr: constr
                    ,moveTo: function( pos ){
                        ret.anchor.state.pos.clone( pos ).sub( 0, 140 );
                        ret.pos.clone( pos );
                        ret.aabb._pos.clone( pos );
                        ret.outerAABB._pos.clone( pos );
                        ret.edge.setAABB( ret.aabb );
                        return ret;
                    }
                    ,drawTo: function( x, y, ctx, renderer ){

                        // renderer.drawRect(x, y, ret.aabb._hw * 2, ret.aabb._hh * 2, rocketStyles, ctx);

                        ctx.save();
                        ctx.translate(x, y + 90);
                        // ctx.translate(0, 90);
                        ctx.drawImage(rocketImg, -rocketImg.width/2, -rocketImg.height/2);
                        ctx.restore();
                    }
                };

                ret.moveTo({ x: x, y: y });
                // constr.angleConstraint( rocket.edge.body, rocket.anchor, gravometer, 0.001 );
                // constr.distanceConstraint( rocket.edge.body, gravometer, 0.01 );
                constr.distanceConstraint( anchor, gravometer, 1 );

                return ret;
            },

            /**
             * DomReady Callback
             * @return {void}
             */
            onDomReady : function(){

                var self = this
                    ;

                Physics(self.initPhysics.bind(self));
            }

        }, ['events']);

        return new Mediator();
    }
);




