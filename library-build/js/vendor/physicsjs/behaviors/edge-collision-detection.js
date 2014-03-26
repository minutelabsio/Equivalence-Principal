/**
 * PhysicsJS v1.0.0-rc1 - 2014-03-23
 * A modular, extendable, and easy-to-use physics engine for javascript
 * http://wellcaffeinated.net/PhysicsJS
 *
 * Copyright (c) 2014 Jasper Palfree <jasper@wellcaffeinated.net>
 * Licensed MIT
 */

(function(e,t){typeof define=="function"&&define.amd?define(["physicsjs","../body/point"],t):typeof exports=="object"?module.exports=t.apply(e,["physicsjs","../body/point"].map(require)):t.call(e,e.Physics)})(this,function(e){return e.behavior("edge-collision-detection",function(t){var n=function(n,r,i){var s,o=n.aabb(),u=e.scratchpad(),a=u.transform(),f=u.vector(),l=u.vector(),c=!1,h=[];return s=o.pos.x+o.x-r.max.x,s>=0&&(f.set(1,0).rotateInv(a.setRotation(n.state.angular.pos)),c={bodyA:n,bodyB:i,overlap:s,norm:{x:1,y:0},mtv:{x:s,y:0},pos:n.geometry.getFarthestHullPoint(f,l).rotate(a).values()},h.push(c)),s=o.pos.y+o.y-r.max.y,s>=0&&(f.set(0,1).rotateInv(a.setRotation(n.state.angular.pos)),c={bodyA:n,bodyB:i,overlap:s,norm:{x:0,y:1},mtv:{x:0,y:s},pos:n.geometry.getFarthestHullPoint(f,l).rotate(a).values()},h.push(c)),s=r.min.x-(o.pos.x-o.x),s>=0&&(f.set(-1,0).rotateInv(a.setRotation(n.state.angular.pos)),c={bodyA:n,bodyB:i,overlap:s,norm:{x:-1,y:0},mtv:{x:-s,y:0},pos:n.geometry.getFarthestHullPoint(f,l).rotate(a).values()},h.push(c)),s=r.min.y-(o.pos.y-o.y),s>=0&&(f.set(0,-1).rotateInv(a.setRotation(n.state.angular.pos)),c={bodyA:n,bodyB:i,overlap:s,norm:{x:0,y:-1},mtv:{x:0,y:-s},pos:n.geometry.getFarthestHullPoint(f,l).rotate(a).values()},h.push(c)),u.done(),h},r=function(t,r,i){return n(t,r,i)},i={aabb:null,restitution:.99,cof:1,channel:"collisions:detected"};return{init:function(n){t.init.call(this),this.options.defaults(i),this.options(n),this.setAABB(this.options.aabb),this.restitution=this.options.restitution,this.body=e.body("point",{treatment:"static",restitution:this.options.restitution,cof:this.options.cof})},setAABB:function(e){if(!e)throw"Error: aabb not set";e=e.get&&e.get()||e,this._edges={min:{x:e.pos.x-e.x,y:e.pos.y-e.y},max:{x:e.pos.x+e.x,y:e.pos.y+e.y}}},connect:function(e){e.on("integrate:velocities",this.checkAll,this)},disconnect:function(e){e.off("integrate:velocities",this.checkAll)},checkAll:function(e){var t=this.getTargets(),n=e.dt,i,s=[],o,u=this._edges,a=this.body;for(var f=0,l=t.length;f<l;f++)i=t[f],i.treatment==="dynamic"&&(o=r(i,u,a),o&&s.push.apply(s,o));s.length&&this._world.emit(this.options.channel,{collisions:s})}}}),e});