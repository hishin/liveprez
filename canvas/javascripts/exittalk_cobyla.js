/**
 * Created by vshin on 8/22/16.
 */

// Global variables that are used, not defined in this script: fitw, fith

var fitpadding = 0;
var fittlx, fittly, fitbrx, fitbry;
var origx;
var origdim;
var align_eps = 1.0e-1;
var fithc = [];
var fitvc = [];
var vca = [];
var la = [];
var ra = [];
var hca = [];
var ta = [];
var ba = [];
var scale = true;

var CobylaSolver_Scale = function () {
    this.initialize = function () {
        this.n = origx.length;
        /**
         * fit-in-slide: origx.length / 3 * 4
         * min and max scaling factor: origx.length/3*2;
         * fithc = fithc.length * 2.0
         * fitvc = fitvc.length * 2.0
         * vca = vca.length * 2.0
         */
        this.m = origx.length / 3 * 4 + origx.length / 3 * 2 +
            fithc.length * 2 + fitvc.length * 2 +
            vca.length * 2 + la.length * 2 + ra.length * 2 +
            hca.length * 2 + ta.length * 2 + ba.length * 2;
        // console.log("this.n " + this.n);
        // console.log('this.m ' + this.m);

        this.origx = origx;
        this.x = [];
        for (var i = 0; i < this.n; i++) {
            this.x.push(origx[i]);
        }
        this.rhobeg = 20.0;
        this.rhoend = 1.0e-6;
        this.iprint = 0;
        this.maxfun = 1e6;
    };

    this.optimize = function () {
        /**
         * @param n : number of variables
         * @param m : number of constraints
         * @param x : initial value72
         * @param con : inequality constraints
         */
        var calcfc = function (n, m, x, con) {
            // initialize constraints
            var nboxes = n / 3;
            var offset = 0;
            // fit inside slide
            for (var i = 0; i < nboxes; i++) {
                con[offset] = x[3 * i] - fitpadding - fittlx; // tl.x >= fittlx+fitpadding
                con[offset + 1] = x[3 * i + 1] - fitpadding - fittly; // tl.y >= fittly+fitpadding
                con[offset + 2] = fitbrx - fitpadding - (x[3 * i] + origdim[2 * i] * x[3 * i + 2]); // br.x <= fitbrx-fitpadding
                con[offset + 3] = fitbry - fitpadding - x[3 * i + 1] + origdim[2 * i + 1] * x[3 * i + 2]; // br.y <= fitbry -fitpadding
                offset += 4;
            }
            // minimum and maximum scaling factor
            for (var i = 0; i < nboxes; i++) {
                con[offset] = x[3 * i + 2] - 0.90; // s >= 0.5
                con[offset + 1] = -x[3 * i + 2] + 1.0; // s <= 1.0
                // console.log('con[' + (offset) + '] = ' + con[offset]);
                // console.log('con[' + (offset + 1) + '] = ' + con[offset + 1]);
                offset += 2;
            }
            // slide-horizontal center aligned
            var brx, tlx;
            for (var i = 0; i < fithc.length; i++) { // brx + tlx = fitbrx + fittlx
                tlx = x[3 * fithc[i]];
                brx = tlx + x[3 * fithc[i] + 2] * origdim[2 * fithc[i]];
                con[offset] = brx + tlx - fitbrx - fittlx;
                con[offset + 1] = -(brx + tlx - fitbrx - fittlx);
                offset += 2;
            }
            // slide-vertical-center aligned
            var bry, tly;
            for (var i = 0; i < fitvc.length; i++) {
                tly = x[3 * fitvc[i] + 1];
                bry = tly + x[3 * fitvc[i] + 2] * origdim[2 * fithc[i] + 1];
                con[offset] = bry + tly - fith;
                con[offset + 1] = -(bry + tly - fith);
                offset += 2;
            }
            // vertical-center aligned (brx + tlx) / 2.0
            var tlx1, brx1, tlx2, brx2;
            for (var i = 0; i < vca.length; i++) {
                var r1 = vca[i][0];
                var r2 = vca[i][1];
                tlx1 = x[3 * r1];
                brx1 = tlx1 + x[3 * r1 + 2] * origdim[2 * r1];
                tlx2 = x[3 * r2];
                brx2 = tlx2 + x[3 * r2 + 2] * origdim[2 * r2];
                con[offset] = (tlx1 + brx1) - (tlx2 + brx2);
                con[offset + 1] = -((tlx1 + brx1) - (tlx2 + brx2));
                offset += 2;
            }
            // left aligned tlx
            for (var i = 0; i < la.length; i++) {
                var r1 = la[i][0];
                var r2 = la[i][1];
                con[offset] = x[3 * r1] - x[3 * r2];
                con[offset + 1] = -(x[3 * r1] - x[3 * r2]);
                offset += 2;
            }
            // right aligned brx
            for (var i = 0; i < ra.length; i++) {
                var r1 = ra[i][0];
                var r2 = ra[i][1];
                tlx1 = x[3 * r1];
                brx1 = tlx1 + x[3 * r1 + 2] * origdim[2 * r1];
                tlx2 = x[3 * r2];
                brx2 = tlx2 + x[3 * r2 + 2] * origdim[2 * r2];
                con[offset] = brx1 - brx2;
                con[offset + 1] = -(brx1 - brx2);
                offset += 2;
            }
            // horizontal-center aligned : (bry + tly)/2.0
            var tly1, bry1, tly2, bry2;
            for (var i = 0; i < hca.length; i++) {
                var r1 = hca[i][0];
                var r2 = hca[i][1];
                tly1 = x[3 * r1 + 1];
                bry1 = tly1 + x[3 * r1 + 2] * origdim[2 * r1 + 1];
                tly2 = x[3 * r2 + 1];
                bry2 = tly2 + x[3 * r2 + 2] * origdim[2 * r2 + 1];
                con[offset] = (bry1 + tly1) - (bry2 + tly2);
                con[offset + 1] = -((bry1 + tly1) - (bry2 + tly2));
                // console.log('con[' + (offset+2*i)+'] = ' + con[offset+2*i]);
                // console.log('con[' + (offset+2*i+1)+'] = ' + con[offset+2*i+1]);
                offset += 2;
            }
            // top aligned tly
            for (var i = 0; i < ta.length; i++) {
                var r1 = ta[i][0];
                var r2 = ta[i][1];
                con[offset] = x[3 * r1 + 1] - x[3 * r2 + 1];
                con[offset + 1] = -(x[3 * r1 + 1] - x[3 * r2 + 1]);
                offset += 2;
            }
            // bottom aligned bry
            for (var i = 0; i < ba.length; i++) {
                var r1 = ba[i][0];
                var r2 = ba[i][1];
                tly1 = x[3 * r1 + 1];
                bry1 = tly1 + x[3 * r1 + 2] * origdim[2 * r1 + 1];
                tly2 = x[3 * r2 + 1];
                bry2 = tly2 + x[3 * r2 + 2] * origdim[2 * r2 + 1];
                con[offset] = bry1 - bry2;
                con[offset + 1] = -(bry1 - bry2);
                offset += 2;
            }
            var obj = objective(x, this.origx);
            return obj;
        };

        var r = 1;
        var iter = 0;
        // while (r > 0 || iter > 1e2) {
        r = FindMinimum(calcfc, this.n, this.m, this.x, this.rhobeg, this.rhoend, this.iprint, this.maxfun);
        iter++;
        // }
        // console.log("iter = " + iter);
        // console.log("r = " + r);
        return this.x;
    };

    this.initialize();
};


var CobylaSolver = function () {
    this.initialize = function () {
        this.n = origx.length;
        /**
         * fit-in-slide: origx.length
         * aspect ratio: origx.length / 2.0
         * fithc = fithc.length * 2.0
         * fitvc = fitvc.length * 2.0
         * vca = vca.length * 2.0
         */
        this.m = origx.length + origx.length / 2 +
            fithc.length * 2 + fitvc.length * 2 +
            vca.length * 2 + la.length * 2 + ra.length * 2 +
            hca.length * 2 + ta.length * 2 + ba.length * 2;
        this.origx = origx;
        this.x = [];
        for (var i = 0; i < this.n; i++) {
            this.x.push(origx[i]);
        }
        this.rhobeg = 20.0;
        this.rhoend = 1.0e-6;
        this.iprint = 0;
        this.maxfun = 1e6;
    };

    this.optimize = function () {
        /**
         * @param n : number of variables
         * @param m : number of constraints
         * @param x : initial value
         * @param con : inequality constraints
         */
        var calcfc = function (n, m, x, con) {
            // initialize constraints
            var nboxes = n / 4.0;
            var offset = 0;
            // fit inside slide
            for (var i = 0; i < nboxes; i++) {
                con[offset] = x[4 * i] - fitpadding - fittlx; // tl.x >= fittlx+fitpadding
                con[offset + 1] = x[4 * i + 1] - fitpadding - fittly; // tl.y >= fittly+fitpadding
                con[offset + 2] = fitbrx - fitpadding - x[4 * i + 2]; // br.x <= fitw-fitpadding
                con[offset + 3] = fitbry - fitpadding - x[4 * i + 3]; // br.y <= fith -fitpadding
                offset += 4;
            }

            // preserve aspect ratio
            for (var i = 0; i < nboxes; i++) {
                var a = (origx[4 * i + 3] - origx[4 * i + 1]) / (origx[4 * i + 2] - origx[4 * i]);
                // console.log("aspect ratio [" + i + "] = " + a);
                con[offset] = a * x[4 * i] - x[4 * i + 1] - a * x[4 * i + 2] + x[4 * i + 3];
                con[offset + 1] = -(a * x[4 * i] - x[4 * i + 1] - a * x[4 * i + 2] + x[4 * i + 3]);
                offset += 2;
            }
            // slide-horizontal center aligned
            for (var i = 0; i < fithc.length; i++) {
                con[offset] = x[4 * fithc[i] + 2] + x[4 * fithc[i]] - fitw;
                con[offset + 1] = -(x[4 * fithc[i] + 2] + x[4 * fithc[i]] - fitw);
                offset += 2;
            }
            // slide-vertical-center aligned: tly + bry = fittly + fitbry
            for (var i = 0; i < fitvc.length; i++) {
                con[offset] = x[4 * fitvc[i] + 3] + x[4 * fitvc[i] + 1] - fittly - fitbry;
                con[offset + 1] = -(x[4 * fitvc[i] + 3] + x[4 * fitvc[i] + 1] - fittly - fitbry);
                offset += 2;
            }
            // vertical-center aligned (brx + tlx) / 2.0
            for (var i = 0; i < vca.length; i++) {
                var r1 = vca[i][0];
                var r2 = vca[i][1];
                con[offset] = (x[4 * r1 + 2] + x[4 * r1]) - (x[4 * r2 + 2] + x[4 * r2]);
                con[offset + 1] = -((x[4 * r1 + 2] + x[4 * r1]) - (x[4 * r2 + 2] + x[4 * r2]));
                offset += 2;
            }
            // left aligned tlx
            for (var i = 0; i < la.length; i++) {
                var r1 = la[i][0];
                var r2 = la[i][1];
                con[offset] = x[4 * r1] - x[4 * r2];
                con[offset + 1] = -(x[4 * r1] - x[4 * r2]);
                offset += 2;
            }
            // right aligned brx
            for (var i = 0; i < ra.length; i++) {
                var r1 = ra[i][0];
                var r2 = ra[i][1];
                con[offset] = x[4 * r1 + 2] - x[4 * r2 + 2];
                con[offset + 1] = -(x[4 * r1 + 2] - x[4 * r2 + 2]);
                offset += 2;
            }
            // horizontal-center aligned
            for (var i = 0; i < hca.length; i++) {
                var r1 = hca[i][0];
                var r2 = hca[i][1];
                con[offset] = (x[4 * r1 + 3] + x[4 * r1 + 1]) - (x[4 * r2 + 3] + x[4 * r2 + 1]);
                con[offset + 1] = -((x[4 * r1 + 3] + x[4 * r1 + 1]) - (x[4 * r2 + 3] + x[4 * r2 + 1]));
                // console.log('con[' + (offset) + '] = ' + con[offset + 2 * i]);
                // console.log('con[' + (offset + 1) + '] = ' + con[offset + 2 * i + 1]);
                offset += 2;
            }
            // top aligned tly
            for (var i = 0; i < ta.length; i++) {
                var r1 = ta[i][0];
                var r2 = ta[i][1];
                con[offset] = x[4 * r1 + 1] - x[4 * r2 + 1];
                con[offset + 1] = -(x[4 * r1 + 1] - x[4 * r2 + 1]);
                offset += 2;
            }
            // bottom aligned bry
            for (var i = 0; i < ba.length; i++) {
                var r1 = ba[i][0];
                var r2 = ba[i][1];
                con[offset] = x[4 * r1 + 3] - x[4 * r2 + 3];
                con[offset + 1] = -(x[4 * r1 + 3] - x[4 * r2 + 3]);
                offset += 2;
            }
            var obj = objective(x, this.origx);
            return obj;
        };

        var r = 1;
        var iter = 0;
        // while (r > 0 || iter > 1e2) {
        r = FindMinimum(calcfc, this.n, this.m, this.x, this.rhobeg, this.rhoend, this.iprint, this.maxfun);
        iter++;
        // }
        // console.log("iter = " + iter);
        // console.log("r = " + r);
        return this.x;
    };

    this.initialize();
};

/**
 * Computes objective function to be minimized
 * @param newx: current value of x
 * @param origx: original input value of x
 * @returns {*}
 */
function objective(newx, origx) {
    var obj;
    if (scale) {
        obj = sumOverlap(newx) + 100 * sumScaleFactor(newx) + sumMoveDistance(origx, newx);
    } else {
        obj = 20 * totalOverlap(newx) + totalAreaDiff(origx, newx) + totalMoveDistance(origx, newx);
    }
    return obj;
};

function sumOverlap(x) {
    var nboxes = x.length / 3;
    var tlx, tly, brx, bry, w, h, s, tlx2, tly2, brx2, bry2, w2, h2, s2;
    var totalarea = 0;
    for (var i = 0; i < nboxes - 1; i++) {
        tlx = x[3 * i];
        tly = x[3 * i + 1];
        s = x[3 * i + 2];
        w = origdim[2 * i];
        h = origdim[2 * i + 1];
        brx = tlx + s * w;
        bry = tly + s * h;
        for (var j = i + 1; j < nboxes; j++) {
            tlx2 = x[3 * j];
            tly2 = x[3 * j + 1];
            s2 = x[3 * j + 2];
            w2 = origdim[2 * j];
            h2 = origdim[2 * j + 1];
            brx2 = tlx2 + s2 * w2;
            bry2 = tly2 + s2 * h2;
            totalarea += rectOverlap(tlx, tly, brx, bry, tlx2, tly2, brx2, bry2);
        }
    }
    return totalarea;
};

/**
 * computes total overlap
 * @param x: Array of [topleft.x, topleft.y, bottomright.x, bottomright.y] for each target
 */
function totalOverlap(x) {
    var nboxes = x.length / 4;
    var totalarea = 0;
    for (var i = 0; i < nboxes - 1; i++) {
        for (var j = i + 1; j < nboxes; j++) {
            totalarea += rectOverlap(x[4 * i], x[4 * i + 1], x[4 * i + 2], x[4 * i + 3], x[4 * j], x[4 * j + 1], x[4 * j + 2], x[4 * j + 3]);
        }
    }
    return totalarea;
};

/**
 * Calcualte overlapping area between two rectangles, r1 and r2
 * @param tlx1: topleft.x of r1
 * @param tly1: topleft.y of r1
 * @param brx1: bottomright.x of r1
 * @param bry1: bottomright.y of r1
 * @param tlx2: topleft.x of r2
 * @param tly2: topleft.x of r2
 * @param brx2: bottomright.x of r2
 * @param bry2: bottomright.y of r2
 */
function rectOverlap(tlx1, tly1, brx1, bry1, tlx2, tly2, brx2, bry2) {
    var area = Math.max(0, Math.min(brx1, brx2) - Math.max(tlx1, tlx2)) *
        Math.max(0, Math.min(bry1, bry2) - Math.max(tly1, tly2));
    return area;
};

function pointMoveDistance(origtlx, origtly, origbrx, origbry, newtlx, newtly, newbrx, newbry) {
    var origcx = (origbrx - origtlx) / 2.0;
    var origcy = (origbry - origtly) / 2.0;
    var newcx = (newbrx - newtlx) / 2.0;
    var newcy = (newbry - newtly) / 2.0;
    var dist = (origcx - newcx) * (origcx - newcx) + (origcy - newcy) * (origcy - newcy);
    return dist;
};

function totalMoveDistance(origx, newx) {
    var nboxes = origx.length / 4;
    var totaldist = 0;
    for (var i = 0; i < nboxes; i++) {
        totaldist += pointMoveDistance(origx[4 * i], origx[4 * i + 1], origx[4 * i + 2], origx[4 * i + 3], newx[4 * i], newx[4 * i + 1], newx[4 * i + 2], newx[4 * i + 3]);
    }
    return totaldist;
};

function sumMoveDistance(origx, newx) {
    var nboxes = origx.length / 3;
    var totaldist = 0;
    var distsq;
    for (var i = 0; i < nboxes; i++) {
        distsq = (origx[3 * i] - newx[3 * i]) * (origx[3 * i] - newx[3 * i]) + (origx[3 * i + 1] - newx[3 * i + 1]) * (origx[3 * i + 1] - newx[3 * i + 1]);
        totaldist += distsq;
    }
    return totaldist;
};

function rectAreaDiff(origtlx, origtly, origbrx, origbry, tlx, tly, brx, bry) {
    var origarea = (origbrx - origtlx) * (origbry - origtly);
    var newarea = (brx - tlx) * (bry - tly);
    var diff = Math.abs(origarea - newarea);
    return diff;
};

function totalAreaDiff(origx, newx) {
    var nboxes = origx.length / 4;
    var totaldiff = 0;
    for (var i = 0; i < nboxes; i++) {
        totaldiff += rectAreaDiff(origx[4 * i], origx[4 * i + 1], origx[4 * i + 2], origx[4 * i + 3], newx[4 * i], newx[4 * i + 1], newx[4 * i + 2], newx[4 * i + 3]);
    }
    return totaldiff;
};

function sumScaleFactor(newx) {
    var nboxes = origx.length / 3;
    var totaldiff = 0;
    for (var i = 0; i < nboxes; i++) {
        totaldiff += newx[3 * i + 2];
    }
    return totaldiff;
};

function initializeVariables(rects) {
    origx = [];
    origdim = [];
    for (var i = 0; i < rects.length; i++) {
        origx.push(rects[i].topLeft.x);
        origx.push(rects[i].topLeft.y);
        if (scale) {
            origx.push(1.0);
            origdim.push(rects[i].width);
            origdim.push(rects[i].height);
        }
        else {
            origx.push(rects[i].bottomRight.x);
            origx.push(rects[i].bottomRight.y);
        }
    }
};

function initAlignmentConstraints(rects) {
    // Slide center constraints
    fithc = [];
    fitvc = [];
    vca = [];
    la = [];
    ra = [];
    hca = [];
    ta = [];
    ba = [];

    for (var i = 0; i < rects.length; i++) {

        if (slideHorizontalCenterAligned(rects[i], (fitbrx + fittlx))) {
            fithc.push(i);
        }
        if (slideVerticalCenterAligned(rects[i], (fitbry + fittly))) {
            fitvc.push(i);
        }
    }

    for (var i = 0; i < rects.length - 1; i++) {
        for (var j = i + 1; j < rects.length; j++) {
            if (verticalCenterAligned(rects[i], rects[j])) {
                vca.push([i, j]);
            } else if (leftAligned(rects[i], rects[j])) {
                la.push([i, j]);
            } else if (rightAligned(rects[i], rects[j])) {
                ra.push([i, j]);
            }

            if (horizontalCenterAligned(rects[i], rects[j])) {
                hca.push([i, j]);
            } else if (topAligned(rects[i], rects[j])) {
                ta.push([i, j]);
            } else if (bottomAligned(rects[i], rects[j])) {
                ba.push([i, j]);
            }

        }
    }
    // console.log("la.length " + la.length);
    // console.log("ra.length " + ra.length);
    // console.log("vca.length " + vca.length);
    // console.log("ta.length " + ta.length);
    // console.log("ba.length " + ba.length);
    // console.log("hca.length " + hca.length);
};

function leftAligned(rect1, rect2) {
    return Math.abs(rect1.topLeft.x - rect2.topLeft.x) < align_eps;
};

function rightAligned(rect1, rect2) {
    return Math.abs(rect1.bottomRight.x - rect2.bottomRight.x) < align_eps;
};

function verticalCenterAligned(rect1, rect2) {
    return Math.abs(rect1.center.x - rect2.center.x) < align_eps;
};

function topAligned(rect1, rect2) {
    return Math.abs(rect1.topLeft.y - rect2.topLeft.y) < align_eps;
};

function bottomAligned(rect1, rect2) {
    return Math.abs(rect1.bottomRight.y - rect2.bottomRight.y) < align_eps;
};

function horizontalCenterAligned(rect1, rect2) {
    return Math.abs(rect1.center.y - rect2.center.y) < align_eps;
};

function slideHorizontalCenterAligned(rect1, fitw) {
    return Math.abs(rect1.center.x - fitw / 2.0) < align_eps;
};

function slideVerticalCenterAligned(rect1, fith) {
    return Math.abs(rect1.center.y - fith / 2.0) < align_eps;
};


function cobylaSolve(rects, parentbox) {
    // initialize parent rect variables
    fittlx = parentbox.tlx;
    fittly = parentbox.tly;
    fitbrx = parentbox.brx;
    fitbry = parentbox.bry;

    // Initialize variable
    initializeVariables(rects);
    // Initialize alignment constraints
    initAlignmentConstraints(rects);

    var overlap;
    if (scale)
        overlap = sumOverlap(origx);
    else
        overlap = totalOverlap(origx);
    var maxoverlap = 10;
    var maxiter = 10;
    var cobyla, newx;
    // console.log(origx);
    // console.log("original overlap = " + overlap);
    var iter = 0;
    newx = origx;
    console.log("overlap " + overlap);
    while (overlap > maxoverlap && iter < maxiter) {
        // Solve
        if (scale)
            cobyla = new CobylaSolver_Scale();
        else
            cobyla = new CobylaSolver();
        newx = cobyla.optimize();
        if (scale)
            overlap = sumOverlap(origx);
        else
            overlap = totalOverlap(origx);
        // console.log("new overlap: " + overlap);
        origx = newx;
        iter++;
    }

    rects = [];
    var newrect, tlx, tly, brx, bry;
    if (scale) {
        for (var i = 0; i < newx.length / 3; i++) {
            tlx = newx[3 * i];
            tly = newx[3 * i + 1];
            brx = tlx + newx[3 * i + 2] * origdim[2 * i];
            bry = tly + newx[3 * i + 2] * origdim[2 * i + 1];
            newrect = new paper.Rectangle(new paper.Point(tlx, tly), new paper.Point(brx, bry));
            rects.push(newrect);
        }
    } else {
        for (var i = 0; i < newx.length / 4; i++) {
            tlx = newx[4 * i];
            tly = newx[4 * i + 1];
            brx = newx[4 * i + 2];
            bry = newx[4 * i + 3];
            newrect = new paper.Rectangle(new paper.Point(tlx, tly), new paper.Point(brx, bry));
            rects.push(newrect);
        }
    }
    return rects;

};

