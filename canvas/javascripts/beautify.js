/**
 * Created by Valentina on 1/25/2017.
 */

var MAX_SWIDTH_PX = 35;
var MAX_ERROR_DIST = 5;

function makeLine(path) {
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
        var p1 = path.getPointAt(i + 1);
        var Q = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y);
        var R = new paper.Point(0.5 * p0.x + 0.5 * p1.x, 0.5 * p0.y + 0.5 * p1.y);
        newpath.add(Q);
        newpath.add(R);
    }
    if (path.length > 1)
        newpath.add(path.getPointAt(path.length));
    newpath.style = path.style;
    path.remove();
    return newpath;
};

function resample(path, maxpoints=100) {
    var points = [];
    var inc = Math.max(path.length / maxpoints, 1)
    for (var i = 0; i < path.length; i += inc) {
        points.push(path.getPointAt(i));
    }
    points.push(path.getPointAt(path.length));
    // points = simplify(points, 1);
    return points;
};

function pathFromPoints(points) {
    var path = new paper.Path();
    for (var i = 0; i < points.length; i++) {
        path.add(points[i]);
    }
    return path;
};

// function discreteFrechetDist(p, q) {
//     var df = new Array(p.length * q.length);
//
//     df[0] = pointDist(p[0], q[0]);
//
//     for (var j = 1; j < q.length; j++) {
//         df[j] = Math.max(df[j-1], pointDist(p[0], q[j]));
//     }
//     for (var i = 1; i < p.length; i++) {
//         df[i] = Math.max(df[(i-1)*q.length], pointDist(p[i], q[0]));
//     }
//     for (var i = 1; i < p.length; i++) {
//         for (var j = 1; j < q.length; j++) {
//             df[i*q.length + j] = Math.max(Math.min(df[(i-1)*q.length + j], df[(i-1)*q.length + j-1], df[i*q.length + j-1]), pointDist(p[i], q[j]));
//         }
//     }
//
//     return df[df.length-1];
// };

function pointDist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

//Checks if point [x,y] is inside the ellipse with center at [origx, origy] and radii [r1, r2], orientation theta
function ellipseDist(x,y, origx, origy, r1, r2, theta) {
    return Math.pow(((x-origx)*Math.cos(theta) + (y-origy)*Math.sin(theta)), 2)/(r1*r1) +
        Math.pow(((x-origx)*Math.sin(theta) - (y-origy)*Math.cos(theta)), 2)/(r2*r2);
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
        new_p = new paper.Point(from_p[i].x * (1.0 - factor) + to_p.x * factor, from_p[i].y * (1.0 - factor) + to_p.y * factor);
        result.add(new_p);
    }
    return result;

};

function trace(path, sobel, r) {
    // var points = resample(path);
    var newpoints = new Array();
    for (var i = 0; i < path.length; i++) {
        var x = Math.round(path.getPointAt(i).x);//points[i].x);
        var y = Math.round(path.getPointAt(i).y);//points[i].y);
        var minx = Math.max(0, x - r);
        var maxx = Math.min(sobel.width, x + r);
        var miny = Math.max(0, y - r);
        var maxy = Math.min(sobel.height, y + r);
        var offset = (y * sobel.width + x) * 4;
        var minvalue = sobel.data[offset] + sobel.data[offset + 1] + sobel.data[offset + 2];
        var svalue;
        var dist;
        var newx = x;
        var newy = y;
        for (var py = miny; py <= maxy; py++) {
            for (var px = minx; px <= maxx; px++) {
                offset = (py * sobel.width + px) * 4;
                svalue = sobel.data[offset] + sobel.data[offset + 1] + sobel.data[offset + 2];
                dist = 0.25 * ((x - px) * (x - px) + (y - py) * (y - py));
                if (dist + svalue < minvalue) {
                    minvalue = dist + svalue;// = svalue;
                    newx = px;
                    newy = py;
                }
            }
        }
        newpoints.push(new paper.Point(newx, newy));
    }
    var newpath = new paper.Path();
    for (var i = 0; i < newpoints.length; i++) {
        newpath.add(newpoints[i]);
    }
    return newpath;
};

function traceColor(praster, path) {
    var r = MAX_ERROR_DIST * praster.scale;
    var points = resample(path, 50);
    var px, py, offset, minx, miny, maxx, maxy;
    var colors = [];
    var c, idx;
    for (var i = 0; i < points.length; i++) {
        //pick salient colors
        var pcolors = [];
        px = Math.round((points[i].x - praster.wslack) * praster.scale);
        py = Math.round((points[i].y - praster.hslack) * praster.scale);
        minx = Math.max(0, px - r);
        maxx = Math.min(praster.width, px + r + 1);
        miny = Math.max(0, py - r);
        maxy = Math.min(praster.height, py + r + 1);
        for (var x = minx; x < maxx; x++) {
            for (var y = miny; y < maxy; y++) {
                idx = y * praster.width + x;
                if (praster.fg[idx] == 0) {
                    continue;
                }
                c = praster.getPixel(x, y);
                // c = colorToAlpha(c, praster.bgcolor);
                if (c.alpha > 0.01)
                    pcolors.push(c);
                // h = c.toCSS(true);
                // var id = hexes.indexOf(h);
                // if (id < 0) {
                //     hexes.push(h);
                //     // colors.push(c);
                //     counts.push(1);
                // } else if (id > 0) {
                //     counts[id]++;
                // }
            }
        }
        // var pclusters = clusterColors(pcolors, 10);
        for (var p = 0; p < pcolors.length; p++) {
            colors.push(pcolors[p]);
        }
    }
    var cclusters = clusterColors(colors, 10);

    if (cclusters.length == 0) {
        path.strokeColor = praster.annocolor;
        path.data.free = true;
        path.data.colors = [path.strokeColor.toCSS()];
    } else {
        cclusters.sort(compareClusters);
        path.strokeColor = cclusters[0].maxcolor;
        path.strokeColor.alpha = 1.0;
        path.data.colors = [];
        for (var i = 0; i < Math.min(cclusters.length, 3); i++) {
            cclusters[i].maxcolor.alpha = 1.0;
            path.data.colors.push(cclusters[i].maxcolor.toCSS());
        }
        path.data.free = false;
    }

    return path;
};


function maskColor(praster, newstroke) {
    var r = 10.0;
    var color = newstroke.strokeColor;
    // var points = resample(newstroke);

    // var maskstroke = new paper.Path();
    var px, py, minx, miny, maxx, maxy;
    var c, dr, dg, db, colordiff;
    for (var i = 0; i <= newstroke.length; i++) {
        px = Math.round(newstroke.getPointAt(i).x * praster.scale);
        py = Math.round(newstroke.getPointAt(i).y * praster.scale);
        minx = Math.max(0, px - r);
        maxx = Math.min(praster.width, px + r + 1);
        miny = Math.max(0, py - r);
        maxy = Math.min(praster.height, py + r + 1);
        for (var x = minx; x < maxx; x++) {
            for (var y = miny; y < maxy; y++) {
                c = praster.getPixel(x, y);
                c = colorToAlpha(c, praster.bgcolor);
                dr = c.red - color.red;
                dg = c.green - color.green;
                db = c.blue - color.blue;
                colordiff = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
                if (colordiff < 0.5) {
                    praster.setPixel(x, y, new paper.Color(1, 0, 1));
                    // maskstroke.add(new paper.Point(x/scale, y/scale));
                }
            }
        }
    }
    // return maskstroke;
};


function getColorMode(praster, bounds, r) {
    var hexes = [];
    var colors = [];
    var counts = [];
    var color, hex;
    for (var x = bounds.left; x < bounds.right; x += r) {
        for (var y = bounds.top; y < bounds.bottom; y += r) {
            color = praster.getPixel(x, y);
            hex = color.toCSS(true);
            var id = hexes.indexOf(hex);
            if (id < 0) {
                hexes.push(hex);
                colors.push(color);
                counts.push(1);
            }
            else {
                counts[id]++;
            }
        }
    }
    var maxid = counts.indexOf(Math.max.apply(null, counts));
    var colormode = colors[maxid];
    return colormode;

};

function traceFill(praster, path) {
    if (isClosed(path)) {
        closePath(path);

        var pixels = praster.getPixelsInside(path);
        var c = getBackgroundColor(pixels, 4);
        if (!c) return;
        var pc = pColorFromDataRGB(c);
        // var alphacolor = colorToAlpha(new paper.Color(pc[0], pc[1], pc[2]), praster.bgcolor);
        // if (!alphacolor)
        //     return;
        path.fillColor = pc;
        path.data.fillalpha = curstroke.fillColor.alpha;
        path.fillColor.alpha = 0.5;
    }

};

function clusterColors(colors, thres) {
    var clusters = [];
    // var idclusters = [];
    var color, clusteravg, colordiff, added, mindiff, bestc;
    var dr, dg, db;
    for (var i = 0; i < colors.length; i++) {
        color = colors[i];
        added = false;
        bestc = -1;
        mindiff = thres;
        for (var c = 0; c < clusters.length; c++) {
            clusteravg = clusters[c].colors[0];
            var l1 = rgb2lab([clusteravg.red * 255, clusteravg.green * 255, clusteravg.blue * 255]);
            var l2 = rgb2lab([color.red * 255, color.green * 255, color.blue * 255]);
            // dr = clusteravg.red - color.red;
            // dg = clusteravg.green - color.green;
            // db = clusteravg.blue - color.blue;
            colordiff = deltaE(l1, l2);//Math.sqrt(2*dr*dr + 4*dg*dg + 3*db*db);
            if (colordiff < mindiff) { // find the closest cluster with distance < 1
                mindiff = colordiff;
                bestc = c;
            }
        }
        if (bestc >= 0) {
            clusters[bestc].addColor(color);
            // idclusters[bestc].push(i);
        }
        else {
            var newc = new ColorCluster();
            newc.addColor(color);
            clusters.push(newc);
            var newids = new Array();
            newids.push(i);
            // idclusters.push(newids);
        }
    }
    return clusters;
};

var ColorCluster = function () {
    this.colors = [];
    this.sumcolor = new paper.Color(0, 0, 0);
    this.avgcolor = new paper.Color(0, 0, 0);
    this.maxcolor = new paper.Color(0, 0, 0, 0);
    this.ncolors = 0.0;
    this.addColor = function (color) {
        this.colors.push(color);
        this.sumcolor = this.sumcolor.add(color);
        this.avgcolor = this.sumcolor.divide(this.colors.length);
        if (this.ncolors == 0 || color.alpha > this.maxcolor.alpha) {
            this.maxcolor = color;
        }
        this.ncolors += color.alpha;
    };
};

function compareClusters(a, b) {
    if (a.ncolors < b.ncolors)
        return 1;
    if (a.ncolors > b.ncolors)
        return -1;
    return 0;
}

function colorToAlpha(p, bgcolor) {
    var r1 = bgcolor.red;
    var r2 = bgcolor.green;
    var r3 = bgcolor.blue;
    var p1, p2, p3;
    var a1, a2, a3, aA;
    p1 = p.red;
    p2 = p.green;
    p3 = p.blue;
    // a1 calculation
    if (p1 > r1) a1 = 1.0 * (p1 - r1) / (1.0 - r1);
    else if (p1 < r1) a1 = 1.0 * (r1 - p1) / r1;
    else a1 = 0.0;

    // a2 calculation
    if (p2 > r2) a1 = 1.0 * (p2 - r2) / (1.0 - r2);
    else if (p2 < r2) a2 = 1.0 * (r2 - p2) / r2;
    else a2 = 0.0;

    // a3 calculation
    if (p3 > r3) a3 = 1.0 * (p3 - r3) / (1.0 - r3);
    else if (p3 < r3) a3 = 1.0 * (r3 - p3) / r3;
    else a3 = 0.0;

    aA = a1;
    if (a2 > aA) aA = a2;
    if (a3 > aA) aA = a3;
    // apply to pixel
    // console.log(aA);
    if (aA >= 0.10) {
        // p1 = (p1 - r1) / aA + r1;
        // p2 = (p2 - r2) / aA + r2;
        // p3 = (p3 - r3) / aA + r3;
        return new paper.Color(p1, p2, p3, aA);
    } else {
        return null;
    }
};

function closePath(path) {
    if (path.closed) return;
    var p, q, dist, minpi, minqj;
    var mindist = Infinity;
    for (var i = 0; i < path.segments.length * 0.1; i++) {
        p = path.segments[i].point;
        for (var j = path.segments.length; j > path.segments.length * 0.9; j--) {
            q = path.segments[j - 1].point;
            dist = p.getDistance(q);
            if (dist < mindist) {
                mindist = dist;
                minpi = i;
                minqj = j;
            }
        }
    }

    path.removeSegments(0, minpi);
    path.removeSegments(minqj + 1 - minpi, path.segments.length);
    path.closePath();
    return path;
};

function isClosed(path) {
    if (path.closed) return true;
    var p = path.getPointAt(0);
    var q = path.getPointAt(path.length);
    var dist = p.getDistance(q);
    return (dist < path.length * 0.05 && dist < 15);
};

function traceClosestPixels(praster, path, velocity) {

    var tracedpx = [];
    var point, px, py, cx, cy, prevcx, prevcy, cos, sin;
    var clabel, color, labc;
    var prevlabel = null;
    var prevp = null;
    var avgcolors = [0, 0, 0, 0];
    var pcount = 0;
    // var inc = Math.max(path.length / 100, 1);
    for (var i = 0; i <= path.length; i += 1) {
        point = path.getPointAt(i);

        // get pixel coordinates
        var pixelp = getPixelPoint(point, praster);
        px = pixelp.x; // Math.round((point.x - praster.wslack) * praster.scale);
        py = pixelp.y; //Math.round((point.y - praster.hslack) * praster.scale);

        // get closest foreground pixel
        cx = praster.dti[px + py * praster.width];
        cy = praster.dtj[px + py * praster.width];

        // propagate if distance to fgpixel is within threshold
        var dist2cur = pointDist(px, py, cx, cy);
        if (dist2cur <= DIST2FG_THRES_A * velocity + 10) {
            clabel = praster.cclabel[cx + cy * praster.width];

            // propagate only within a single connected component per stroke
            if (prevlabel && prevlabel != clabel) {
                var dist2prev = pointDist(prevcx, prevcy, cx, cy);
                if (dist2prev - dist2cur < DIST2FG_THRES_B) {
                    continue;
                }
            }
            color = praster.getPixel(cx, cy);
            avgcolors[0] += color.red;
            avgcolors[1] += color.green;
            avgcolors[2] += color.blue;
            avgcolors[3] += color.alpha;
            pcount++;
            labc = rgb2lab([color.red * 255, color.green * 255, color.blue * 255]);

            floodFill(praster, cx, cy, cx, cy, clabel, labc, tracedpx, velocity);
            prevlabel = clabel;
            prevcx = cx;
            prevcy = cy;

        }
        prevp = point;
    }


    avgcolors[0] /= pcount;
    avgcolors[1] /= pcount;
    avgcolors[2] /= pcount;
    avgcolors[3] /= pcount;

    return [tracedpx, avgcolors];
}
;

function traceClosestPixelsEllipse(praster, path, rstart, ra, rb, unrevealed) {
    // console.log("Path.length: " + path.length);
    var point, pixelp, px, py, cx, cy, startdist;
    var tracedpx = [];
    for (var i = 0; i < path.length; i += 1/praster.scale ) {
        point = path.getPointAt(i);
        pixelp = getPixelPoint(point, praster);
        px = pixelp.x;
        py = pixelp.y;

        // get closest foreground pixel
        cx = praster.dti[px + py * praster.width];
        cy = praster.dtj[px + py * praster.width];

        // if distance to closest fg pixel is within threshold, propagate
        startdist = pointDist(px,py,cx,cy);
        // For debugging: Draw an ellipse centered at point with radius ra, rb, and direction theta
        // if (DEBUG) {
        //     var pointc = point;//getCanvasPoint(new paper.Point(cx,cy), praster);
        //     var lefttop = new paper.Point(pointc.x-ra/2.0*praster.scale, pointc.y-rb/2.0*praster.scale);
        //     var size = new paper.Size(ra*praster.scale, rb*praster.scale);
        //     var rectangle = new paper.Shape.Rectangle(lefttop, size);
        //     var ellipse = new paper.Path.Ellipse(rectangle.bounds);
        //     var tangent = path.getTangentAt(i);
        //     var theta;
        //     if (tangent.x != 0)
        //         theta = Math.atan(tangent.y/tangent.x);
        //     else
        //         theta = Math.PI/2;
        //     ellipse.rotate(theta*180/Math.PI, pointc);
        //     ellipse.strokeColor = 'red';
        //     ellipse.strokeWidth = 1;
        // }

        if (startdist <= rstart) {
            var tangent = path.getTangentAt(i);
            var theta;
            if (tangent.x != 0)
                theta = Math.atan(tangent.y/tangent.x);
            else
                theta = Math.PI/2;
            floodFillEllipse(praster, cx, cy, cx, cy, ra, rb, theta, tracedpx, unrevealed);


        }
    }
    return tracedpx;
};


function floodFillEllipse(praster, x, y, origx, origy, ra, rb, theta, tracedpx, unrevealed) {
    // out of image bound
    if (x < 0 || x >= praster.width || y < 0 || y >= praster.height) return;
    // already filled
    if (unrevealed && praster.revealed[x+y*praster.width] > 0) return;
    if (!unrevealed && praster.revealed[x+y*praster.width] == 0) return;
    // not foreground pixel
    if (!praster.fg[x+y*praster.width]) return;

    // if not within ellipse
    var dist = ellipseDist(x,y,origx,origy, ra, rb, theta);
    if (dist > 1) return;

    if (unrevealed)
        praster.revealed[x+y*praster.width] = 1;
    else
        praster.revealed[x+y*praster.width] = 0;
    tracedpx.push([x,y]);
    floodFillEllipse(praster, x-1, y, origx, origy, ra, rb, theta, tracedpx, unrevealed);
    floodFillEllipse(praster, x+1, y, origx, origy, ra, rb, theta, tracedpx, unrevealed);
    floodFillEllipse(praster, x, y-1, origx, origy, ra, rb, theta, tracedpx, unrevealed);
    floodFillEllipse(praster, x, y+1, origx, origy, ra, rb, theta, tracedpx, unrevealed);
};

function floodFill(praster, x, y, origx, origy, cl, labc, tracedpx, velocity) {
    var w = praster.width;
    if (x < 0 || x >= w || y < 0 || y >= praster.height) return;
    if (praster.revealed[x + y * w]) return;
    if (!praster.fg[x + y * w]) return;
    if (praster.cclabel[x + y * w] != cl) return;

    if (pointDist(x,y,origx,origy) > Math.min(40, (Math.exp(0.015*velocity)+10))) {
        var dist2edge = praster.dtedge[x + y * w];
        if (dist2edge > DIST2FG_THRES_B) return;
        else {
            praster.revealed[x + y * w] = 1;
            tracedpx.push([x, y]);
            return;
        }
    }
    var pc = praster.getPixel(x, y);
    var labpc = rgb2lab([pc.red * 255, pc.green * 255, pc.blue * 255]);
    var colordiff = deltaE(labc, labpc);
    // if (colordiff > 0.04 * velocity + 10) {
    //     return;
    // }
    praster.revealed[x + y * w] = 1;
    tracedpx.push([x, y]);

    floodFill(praster, x - 1, y, origx, origy, cl, labc, tracedpx, velocity);
    floodFill(praster, x + 1, y, origx, origy, cl, labc, tracedpx, velocity);
    floodFill(praster, x, y - 1, origx, origy, cl, labc, tracedpx, velocity);
    floodFill(praster, x, y + 1, origx, origy, cl, labc, tracedpx, velocity);
};

function traceWidth(praster, path) {
    var inc = Math.max(path.length / 100, 1);
    var point, normal, p, p1, p2, coords1, coords2, vals1, vals2, id1, id2, id;
    var maxd = MAX_SWIDTH_PX / 2.0 + MAX_ERROR_DIST * praster.scale;
    var widths = [];
    for (var i = 0; i <= path.length; i += inc) {
        point = path.getPointAt(i);
        normal = path.getNormalAt(i);
        if (path.length == 0) {
            normal = new paper.Point(1, 0);
        }
        p1 = point.add(normal.multiply(maxd));
        p2 = point.subtract(normal.multiply(maxd));

        // px = Math.round((points[i].x - praster.wslack)*praster.scale);
        // py = Math.round((points[i].y - praster.hslack)*praster.scale);
        p1 = new paper.Point((p1.x - praster.wslack) * praster.scale, (p1.y - praster.hslack) * praster.scale);//p1.multiply(praster.scale);
        p2 = new paper.Point((p2.x - praster.wslack) * praster.scale, (p2.y - praster.hslack) * praster.scale);//p2.multiply(praster.scale);
        p = new paper.Point((point.x - praster.wslack) * praster.scale, (point.y - praster.hslack) * praster.scale);//point.multiply(praster.scale);
        coords1 = bresenhamCoordinates(p, p1);
        coords2 = bresenhamCoordinates(p, p2);

        // praster.setPixel(p1.x, p1.y, new paper.Color(1,0,0));
        // praster.setPixel(p2.x, p2.y, new paper.Color(0,1,0));

        // get the distance transform on those coordinates
        vals1 = getDataValues(praster.swidth, praster.width, praster.height, coords1);
        vals2 = getDataValues(praster.swidth, praster.width, praster.height, coords2);
        // check if point is local maxima
        if (vals1.length > 1 && vals2.length > 1 && vals1[0] > vals1[1] && vals1[0] > vals2[1]) {
            if (vals1[0] > MAX_SWIDTH_PX / 2.0) widths.push(-1);
            else widths.push(vals1[0]);
        } else {
            // find id of closest local maximum
            id1 = findFirstLocalMaxima(vals1);
            id2 = findFirstLocalMaxima(vals2);

            if (id1 < id2 && id1 > 0) {
                if (vals1[id1] > MAX_SWIDTH_PX / 2.0) widths.push(-1);
                else widths.push(vals1[id1]);
            } else if (id2 < id1 && id2 > 0) {
                if (vals2[id2] > MAX_SWIDTH_PX / 2.0) widths.push(-1);
                else widths.push(vals2[id2]);
            } else {
                widths.push(-1);
            }
        }
    }
    var mwidth = findMode(widths);
    if (mwidth == -1 || mwidth == 0) {
        path.strokeWidth = 1.0 / praster.scale;
    } else {
        path.strokeWidth = mwidth * 2.0 / praster.scale;
    }
};

function findMode(array) {
    if (array.length == 0)
        return -1;
    var modeMap = {};
    var maxEl = array[0], maxCount = 1;
    for (var i = 0; i < array.length; i++) {
        var el = array[i];
        if (modeMap[el] == null)
            modeMap[el] = 1;
        else
            modeMap[el]++;
        if (modeMap[el] > maxCount) {
            maxEl = el;
            maxCount = modeMap[el];
        }
    }
    return maxEl;
};

function findFirstLocalMaxima(vals) {
    for (var i = 1; i < vals.length - 1; i++) {
        if (vals[i] > vals[i - 1] && vals[i] >= vals[i + 1])
            return i;
    }
    return Infinity;
};

function getDataValues(data, m, n, coords) {
    var vals = [];
    var x, y, off;
    var preval;
    for (var i = 0; i < coords.length; i++) {
        x = coords[i].x;
        y = coords[i].y;
        if (x < 0 || x >= m || y < 0 || y >= n) continue;
        off = y * m + x;
        if (preval && preval == data[off])
            continue;
        vals.push(data[off]);
        preval = data[off];
    }
    return vals;
};

function bresenhamCoordinates(p1, p2) {
    var x1 = Math.round(p1.x);
    var x2 = Math.round(p2.x);
    var y1 = Math.round(p1.y);
    var y2 = Math.round(p2.y);

    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var sx = (x1 < x2) ? 1 : -1;
    var sy = (y1 < y2) ? 1 : -1;
    var err = dx - dy;

    var coords = [];
    coords.push({x: x1, y: y1});

    while (!((x1 == x2) && (y1 == y2))) {
        var e2 = err * 2;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
        coords.push({x: x1, y: y1});
    }
    return coords;
};

function traceWidthOld(width, m, n, path, scale) {
    var point, px, py, idx;
    var widths = [];
    var maxwidth = 0;
    for (var i = 0; i < path.length; i++) {
        point = path.getPointAt(i);
        px = Math.floor(point.x * scale);
        py = Math.floor(point.y * scale);
        idx = py * m + px;
        widths.push(width[idx]);
        maxwidth = Math.max(maxwidth, width[idx]);
    }
    console.log("maxwidth: " + maxwidth);
    return maxwidth / scale;
};

function moveElementY(praster, elem, dist) {
    var sub = praster.getSubRaster(elem.rect.bounds);

    if (elem.eraster != null) {
        elem.eraster.replaceWith(sub);
    }
    elem.eraster = sub;

    sub.translate(new paper.Point(0, dist));
    elem.miny += dist;
};