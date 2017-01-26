/**
 * Created by Valentina on 1/25/2017.
 */

function makeLine(path) {
    var from = path.firstSegment.point;
    var to = path.lastSegment.point;
    var line = new paper.Path.Line(from ,to);
    line.style = path.style;
    return line;
};

function chaikinSmooth(path) {
    var output = new paper.Path();
    if (path.length > 0)
        output.add(path.getPointAt(0));
    for (var i = 0; i <= path.length - 1; i++) {
        var p0 = path.getPointAt(i);
        var p1 = path.getPointAt(i+1);

        var Q = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y);
        var R = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y );
        output.add(Q);
        output.add(R);
    }
    if (path.length > 1)
        output.add(path.getPointAt(path.length));
    output.style = path.style;
    path.remove();
    return output;
};

function resample(path) {
    var points = [];
    for (var i = 0; i <= path.length; i++) {
        points.push(path.getPointAt(i));
    }
    var samples = simplify(points, 3);
    var newpath = new paper.Path();
    newpath.strokeColor = 'red';
    newpath.strokeWidth = 1;
    for (var i = 0; i <samples.length; i++) {
        newpath.add(new paper.Point(samples[i].x, samples[i].y));
    }
    newpath.selected = true;
    return newpath;
};