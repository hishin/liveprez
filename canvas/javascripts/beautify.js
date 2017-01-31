/**
 * Created by Valentina on 1/25/2017.
 */


function makeLine(path) {
    console.log(path);
    var from = path.firstSegment.point;//points[0];
    var to = path.lastSegment.point;//points[points.length-1];
    var line = new paper.Path();
    line.add(from);
    line.add(to);
    line.style = path.style;
    path.remove();
    return line;
};

// function chaikinSmooth(points) {
//     var newpoints = new Array();
//     if (points.length > 0)
//         newpoints.push(points[0]);
//     for (var i = 0; i < points.length - 1; i++) {
//         var p0 = points[i];
//         var p1 = points[i+1];
//         var Q = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y);
//         var R = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y );
//         newpoints.push(Q);
//         newpoints.push(R);
//     }
//     if (points.length > 1)
//         newpoints.push(points[points.length-1]);
//     return newpoints;
// };

function chaikinSmooth(path) {
    var newpath = new paper.Path();
    if (path.length > 0)
        newpath.add(path.getPointAt(0));
    for (var i = 0; i <= path.length - 1; i++) {
        var p0 = path.getPointAt(i);
        var p1 = path.getPointAt(i+1);
        var Q = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y);
        var R = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y );
        newpath.add(Q);
        newpath.add(R);
    }
    if (path.length > 1)
        newpath.add(path.getPointAt(path.length));
    newpath.style = path.style;
    path.remove();
    return newpath;
};

function resample(path) {
    var points = [];
    for (var i = 0; i <= path.length; i++) {
        points.push(path.getPointAt(i));
    }
    var samples = simplify(points, 1);
    return samples;
};

function pathFromPoints(points) {
    var path = new paper.Path();
    for (var i = 0; i < points.length; i++) {
        path.add(points[i]);
    }
    return path;
};

function discreteFrechetDist(p, q) {
    var df = new Array(p.length * q.length);

    df[0] = pointDist(p[0], q[0]);

    for (var j = 1; j < q.length; j++) {
        df[j] = Math.max(df[j-1], pointDist(p[0], q[j]));
    }
    for (var i = 1; i < p.length; i++) {
        df[i] = Math.max(df[(i-1)*q.length], pointDist(p[i], q[0]));
    }
    for (var i = 1; i < p.length; i++) {
        for (var j = 1; j < q.length; j++) {
            df[i*q.length + j] = Math.max(Math.min(df[(i-1)*q.length + j], df[(i-1)*q.length + j-1], df[i*q.length + j-1]), pointDist(p[i], q[j]));
        }
    }

    return df[df.length-1];
};

function pointDist(p0, p1) {
    return Math.sqrt(Math.pow(p0.x-p1.x, 2) + Math.pow(p0.y-p1.y, 2));
};

function distToPath(points, pathq) {
    if (pathq.className == "Shape") {
        pathq = pathq.toPath();
    }
    var dist = 0.0;
    var q;
    for (var i = 0; i < points.length; i++) {
        q = pathq.getNearestPoint(points[i]);
        dist += q.getDistance(points[i], true);
    }
    return dist;
};

function findClosestPath(stroke, pitem) {
    var mindist = Infinity;
    var closestpath = null;
    if (pitem.children) {
        for (var i = 0; i < pitem.children.length; i++) {
            var closest = findClosestPath(stroke, pitem.children[i]);
            if (closest[0] < mindist) {
                mindist = closest[0];
                closestpath = closest[1];
            }
        }
    }
    else if (!pitem.clipMask) {
        var points = resample(stroke);
        var dist = distToPath(points, pitem);
        if (dist < mindist) {
            mindist = dist;
            closestpath = pitem;
        }
    }
    return [mindist, closestpath];

};

function interpolate(from, to, factor) {
    var from_p = resample(from);
    var result = new paper.Path();
    var to_p;
    var new_p;
    for (var i = 0; i < from_p.length; i++) {
        to_p = to.getNearestPoint(from_p[i]);
        new_p = new paper.Point(from_p[i].x*(1.0-factor) + to_p.x*factor , from_p[i].y*(1.0-factor) + to_p.y*factor);
        result.add(new_p);
    }
    return result;

};