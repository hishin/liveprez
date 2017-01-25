/**
 * Created by Valentina on 1/25/2017.
 */

function makeLine(path) {
    var from = path.firstSegment.point;
    var to = path.lastSegment.point;
    var line = new paper.Path.Line(from ,to);
    line.style = path.style;
    path.remove();
};

function chaikinSmooth(path) {
    var output = new paper.Path();
    for (var i = 0; i < path.length - 1; i++) {
        var p0 = path.getPointAt(i);
        var p1 = path.getPointAt(i+1);

        var Q = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y);
        var R = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y );
        output.add(Q);
        output.add(R);
    }
    output.style = path.style;
    // if (input.length > 1)
    //     output.push(copy([0, 0], input[ input.length-1 ]))
    // return output
};