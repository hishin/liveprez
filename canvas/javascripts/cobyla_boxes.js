/**
 * Created by vshin on 8/22/16.
 */

var origx;
var align_eps = 1.0e-1;
var slidehc = [];
var slidevc = [];
var vca = [];
var la = [];
var ra = [];
var hca = [];
var ta = [];
var ba = [];

var CobylaSolver = function () {
    this.initialize = function () {
        this.n = origx.length;
        /**
         * fit-in-slide: origx.length
         * aspect ratio: origx.length / 2.0
         * slidehc = slidehc.length * 2.0
         * slidevc = slidevc.length * 2.0
         * vca = vca.length * 2.0
         */
        this.m = origx.length + origx.length / 2 +
            slidehc.length * 2 + slidevc.length * 2 +
            vca.length * 2 + la.length * 2 + ra.length * 2 +
            hca.length * 2 + ta.length * 2 + ba.length * 2;
        console.log('m = ' + this.m);
        this.origx = origx;
        this.x = [];
        for (var i = 0; i < this.n; i++) {
            this.x.push(origx[i]);
        }
        this.rhobeg = 10.0;
        this.rhoend = 1.0e-3;
        this.iprint = 1;
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
                con[offset + 4 * i] = x[4 * i]; // tl.x >= 0
                con[offset + 4 * i + 1] = x[4 * i + 1]; // tl.y >= 0
                con[offset + 4 * i + 2] = slidew - x[4 * i + 2]; // br.x <= slidew
                con[offset + 4 * i + 3] = slideh - x[4 * i + 3]; // br.y <= slideh
            }
            offset += 4 * nboxes;
            // preserve aspect ratio
            for (var i = 0; i < nboxes; i++) {
                var a = (origx[4 * i + 3] - origx[4 * i + 1]) / (origx[4 * i + 2] - origx[4 * i]);
                con[offset + 2 * i] = a * x[4 * i] - x[4 * i + 1] - a * x[4 * i + 2] + x[4 * i + 3];
                con[offset + 2 * i + 1] = -(a * x[4 * i] - x[4 * i + 1] - a * x[4 * i + 2] + x[4 * i + 3]);
            }
            // slide-horizontal center aligned
            offset += 2 * nboxes;
            for (var i = 0; i < slidehc.length; i++) {
                con[offset + 2 * i] = x[4 * slidehc[i] + 2] + x[4 * slidehc[i]] - slidew;
                con[offset + 2 * i + 1] = -(x[4 * slidehc[i] + 2] + x[4 * slidehc[i]] - slidew);
                offset += 2;
            }
            // slide-vertical-center aligned
            for (var i = 0; i < slidevc.length; i++) {
                con[offset + 2 * i] = x[4 * slidevc[i] + 3] + x[4 * slidevc[i]+1] - slideh;
                con[offset + 2 * i + 1] = -(x[4 * slidevc[i] + 3] + x[4 * slidevc[i]+1] - slideh);
                offset += 2;
            }
            // vertical-center aligned (brx + tlx) / 2.0
            for (var i = 0; i < vca.length; i++) {
                var r1 = vca[i][0];
                var r2 = vca[i][1];
                con[offset+2*i] = (x[4*r1+2] + x[4*r1]) - (x[4*r2+2] + x[4*r2]);
                con[offset+2*i+1] = -((x[4*r1+2] + x[4*r1]) - (x[4*r2+2] + x[4*r2]));
                offset += 2;
            }
            // left aligned tlx
            for (var i = 0; i < la.length; i++) {
                var r1 = la[i][0];
                var r2 = la[i][1];
                con[offset+2*i] = x[4*r1] - x[4*r2];
                con[offset+2*i+1] = -(x[4*r1] - x[4*r2]);
                offset += 2;
            }
            // right aligned brx
            for (var i = 0; i < ra.length; i++) {
                var r1 = ra[i][0];
                var r2 = ra[i][1];
                con[offset+2*i] = x[4*r1+2] - x[4*r2+2];
                con[offset+2*i+1] = -(x[4*r1+2] - x[4*r2+2]);
                offset += 2;
            }
            // horizontal-center aligned
            for (var i = 0; i < hca.length; i++) {
                var r1 = hca[i][0];
                var r2 = hca[i][1];
                con[offset+2*i] = (x[4*r1+3] + x[4*r1+1]) - (x[4*r2+3] + x[4*r2+1]);
                con[offset+2*i+1] = -((x[4*r1+3] + x[4*r1+1]) - (x[4*r2+3] + x[4*r2+1]));
                console.log('con[' + (offset+2*i)+'] = ' + con[offset+2*i]);
                console.log('con[' + (offset+2*i+1)+'] = ' + con[offset+2*i+1]);
                offset += 2;
            }
            // top aligned tly
            for (var i = 0; i < ta.length; i++) {
                var r1 = ta[i][0];
                var r2 = ta[i][1];
                con[offset+2*i] = x[4*r1+1] - x[4*r2+1];
                con[offset+2*i+1] = -(x[4*r1+1] - x[4*r2+1]);
                offset += 2;
            }
            // bottom aligned bry
            for (var i = 0; i < ba.length; i++) {
                var r1 = ba[i][0];
                var r2 = ba[i][1];
                con[offset+2*i] = x[4*r1+3] - x[4*r2+3];
                con[offset+2*i+1] = -(x[4*r1+3] - x[4*r2+3]);
                offset += 2;
            }
            var obj = objective(x, this.origx);
            return obj;
        };

        var r = 1;
        var iter = 0;
        while (r > 0 || iter > 1e2) {
            r = FindMinimum(calcfc, this.n, this.m, this.x, this.rhobeg, this.rhoend, this.iprint, this.maxfun);
            iter++;
        }
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
    var obj = 20 * totalOverlap(newx) + 5* totalAreaDiff(origx, newx) + totalMoveDistance(origx, newx);
    return obj;
};

/**
 * computes total overlap
 * @param x: Array of [topleft.x, topleft.y, bottomright.x, bottomright.y] for each box
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

function totalMoveDistance(origx, newx) {
    var nboxes = origx.length / 4;
    var totaldist = 0;
    for (var i = 0; i < nboxes; i++) {
        totaldist += pointMoveDistance(origx[4 * i], origx[4 * i + 1], origx[4 * i + 2], origx[4 * i + 3], newx[4 * i], newx[4 * i + 1], newx[4 * i + 2], newx[4 * i + 3]);
    }
    return totaldist;
};

function pointMoveDistance(origtlx, origtly, origbrx, origbry, newtlx, newtly, newbrx, newbry) {
    var origcx = (origbrx - origtlx) / 2.0;
    var origcy = (origbry - origtly) / 2.0;
    var newcx = (newbrx - newtlx) / 2.0;
    var newcy = (newbry - newtly) / 2.0;
    var dist = (origcx - newcx) * (origcx - newcx) + (origcy - newcy) * (origcy - newcy);
    return dist;
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

function initXfromRects(rects) {
    var x = [];
    for (var i = 0; i < rects.length; i++) {
        x.push(rects[i].topLeft.x);
        x.push(rects[i].topLeft.y);
        x.push(rects[i].bottomRight.x);
        x.push(rects[i].bottomRight.y);
    }
    return x;
};

function initAlignmentConstraints(rects) {
    // Slide center constraints
    slidehc = [];
    slidevc = [];
    vca = [];
    la = [];
    ra = [];
    hca = [];
    ta = [];
    ba = [];

    for (var i = 0; i < rects.length; i++) {
        if (slideHorizontalCenterAligned(rects[i], slidew)) {
            slidehc.push(i);
        }
        if (slideVerticalCenterAligned(rects[i], slideh)) {
            slidevc.push(i);
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

function slideHorizontalCenterAligned(rect1, slidew) {
    return Math.abs(rect1.center.x - slidew / 2.0) < align_eps;
};

function slideVerticalCenterAligned(rect1, slideh) {
    return Math.abs(rect1.center.y - slideh / 2.0) < align_eps;
};


function cobylaSolve(mypapers) {
    // Copy original layout to mypaper[1] for comparison
    mypapers[1].project.clear();
    copyPaperToFrom(mypapers[1], mypapers[0]);

    // Initialize variable
    var rectPaths = mypapers[0].project.activeLayer.getItems();
    var rects = [];
    for (var i = 0; i < rectPaths.length; i++) {
        rects.push(rectPaths[i].bounds);
    }
    origx = initXfromRects(rects);

    // Initialize alignment constraints
    initAlignmentConstraints(rects);

    // Solve
    var cobyla = new CobylaSolver();
    var newx = cobyla.optimize.call(cobyla);


    // Draw new solution to
    mypapers[0].project.clear();
    mypapers[0].activate();

    for (var i = 0; i < newx.length / 4; i++) {
        var tl = new paper.Point(Number(newx[4 * i].toFixed(2)), Number(newx[4 * i + 1].toFixed(2)));
        var br = new paper.Point(Number(newx[4 * i + 2].toFixed(2)), Number(newx[4 * i + 3].toFixed(2)));
        var rectPath = new paper.Path.Rectangle(tl, br);
        rectPath.strokeColor = '#3366ff';
    }

};

