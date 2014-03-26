/**
 * PhysicsJS v1.0.0-rc1 - 2014-03-23
 * A modular, extendable, and easy-to-use physics engine for javascript
 * http://wellcaffeinated.net/PhysicsJS
 *
 * Copyright (c) 2014 Jasper Palfree <jasper@wellcaffeinated.net>
 * Licensed MIT
 */

(function(e,t){typeof define=="function"&&define.amd?define(["physicsjs"],t):typeof exports=="object"?module.exports=t.apply(e,["physicsjs"].map(require)):t.call(e,e.Physics)})(this,function(e){return e.geometry("circle",function(t){var n={radius:1};return{init:function(r){t.init.call(this,r),r=e.util.extend({},n,r),this.radius=r.radius,this._aabb=e.aabb()},aabb:function(e){var t=this.radius,n=this._aabb;return n.halfWidth()===t?n.get():n.set(-t,-t,t,t).get()},getFarthestHullPoint:function(t,n){return n=n||e.vector(),n.clone(t).normalize().mult(this.radius)},getFarthestCorePoint:function(t,n,r){return n=n||e.vector(),n.clone(t).normalize().mult(this.radius-r)}}}),e});