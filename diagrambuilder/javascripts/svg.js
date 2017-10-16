var tokens;
var maxdist = 100;
var eps = 10e-3;


var TokenChain = function(path) {
    this.path = path;
    this.tlist = [];
    this.totalfrac = 0.0;
    this.cost = 1.0;
    this.mdist = 0.0;

    this.addToken = function(t, p) {
        if (!p) { // first token
            this.tlist.push(t);
            this.p1 = t.point1;
            this.p2 = t.point2;
            this.c1 = t;
            this.c2 = t;
            this.length = t.length;
            this.curve_spanned_length = curveLengthSpanned(t, path);
            this.path_spanned_length = pathLengthSpanned(t, path);

            this.curvefrac = this.curve_spanned_length / this.length;
            this.pathfrac = this.path_spanned_length / this.path.length;

            var dist = tokenToPathDistance(t, path);
            this.mdist = Math.max(this.mdist, dist);
            this.cdist = this.mdist/maxdist;

            this.cost = 1.0 - this.curvefrac*this.pathfrac*(1.0 - this.cdist);
            var best_curvefrac = (this.length - this.curve_spanned_length)/(this.length - this.curve_spanned_length + this.path.length);
            this.best_curvefrac = best_curvefrac;
            this.best_possible_cost = 1.0 - (1.0 - best_curvefrac)*(1.0 - this.cdist);
            return this;
        } else { // adding additional token
            var newchain = new TokenChain(this.path);
            newchain.tlist = this.tlist.slice(0, this.tlist.length);
            newchain.tlist.push(t);
            newchain.length = this.length + t.length;
            newchain.curve_spanned_length = this.curve_spanned_length + curveLengthSpanned(t, path);
            newchain.path_spanned_length = this.path_spanned_length + pathLengthSpanned(t, path);

            newchain.curvefrac = newchain.curve_spanned_length/newchain.length;
            newchain.pathfrac = newchain.path_spanned_length/newchain.path.length;

            var dist = tokenToPathDistance(t, path);
            newchain.mdist = Math.max(this.mdist, dist);
            newchain.cdist = newchain.mdist/maxdist;

            newchain.cost = 1.0 - newchain.curvefrac*newchain.pathfrac*(1.0 - newchain.cdist);
            var best_curvefrac = (newchain.length - newchain.curve_spanned_length)/(newchain.length - newchain.curve_spanned_length + newchain.path.length);
            newchain.best_curvefrac = best_curvefrac;
            newchain.best_possible_cost = 1.0 - (1.0-best_curvefrac)*(1.0 - newchain.cdist);

            if (this.p1.getDistance(p) < eps) {
                if (t.point1.getDistance(p) < eps) {
                    newchain.p1 = t.point2;
                } else {
                    newchain.p1 = t.point1;
                }
                newchain.c1 = t;
                newchain.p2 = this.p2;
                newchain.c2 = this.c2;
            } else if (this.p2.getDistance(p) < eps) {
                if (t.point1.getDistance(p) <eps) {
                    newchain.p2 = t.point2;
                } else {
                    newchain.p2 = t.point1;
                }
                newchain.c2 = t;
                newchain.p1 = this.p1;
                newchain.c1 = this.c1;
            } else {
                console.log("Error: You cannot add a disconnected token to a partial chain!")
            }
            return newchain;
        }
    };

    this.getConnectedPoint = function(t) {
        // var tpoint = new paper.Path.Circle(this.p2, 5);
        // tpoint.strokeColor = 'blue';
        if (t.point1.getDistance(this.p1) < eps && t != this.c1) {
            // var tpoint = new paper.Path.Circle(t.point1, 5);
            // tpoint.fillColor = 'yellow';

            return t.point1;
        }
        if (t.point1.getDistance(this.p2) < eps && t != this.c2) {
            // var tpoint = new paper.Path.Circle(t.point1, 5);
            // tpoint.fillColor = 'red';
            return t.point1;
        }
        if (t.point2.getDistance(this.p1) < eps && t != this.c1) {
            // var tpoint = new paper.Path.Circle(t.point2, 5);
            // tpoint.fillColor = 'yellow';

            return t.point2;
        }
        if (t.point2.getDistance(this.p2) < eps && t != this.c2) {
            // var tpoint = new paper.Path.Circle(t.point2, 5);
            // tpoint.fillColor = 'red';
            return t.point2;
        }
        return null;
    };
};

/**
 * return fraction p of path spanned by the token curve
 * @param token
 * @param path
 */
function curveFractionSpanned(token, path) {
    var p1 = token.getNearestPoint(path.firstSegment.point);//path.getNearestPoint(token.segment1.point);
    var offset1 = token.getOffsetOf(p1);
    var p2 = token.getNearestPoint(path.lastSegment.point);
    var offset2 = token.getOffsetOf(p2);
    var frac = Math.abs(offset1 - offset2) / token.length;

    return frac;
};

function curveLengthSpanned(token, path) {
    var p1 = token.getNearestPoint(path.firstSegment.point);//path.getNearestPoint(token.segment1.point);
    var offset1 = token.getOffsetOf(p1);
    var p2 = token.getNearestPoint(path.lastSegment.point);
    var offset2 = token.getOffsetOf(p2);
    var len = Math.abs(offset1 - offset2);

    return len;
};

function pathFractionSpanned(token, path) {
    var p1 = path.getNearestPoint(token.segment1.point);
    var offset1 = path.getOffsetOf(p1);
    var p2 = path.getNearestPoint(token.segment2.point);
    var offset2 = path.getOffsetOf(p2);
    var frac = Math.abs(offset1 - offset2) / path.length;

    return frac;
};

function pathLengthSpanned(token, path) {
    var p1 = path.getNearestPoint(token.segment1.point);
    var offset1 = path.getOffsetOf(p1);
    var p2 = path.getNearestPoint(token.segment2.point);
    var offset2 = path.getOffsetOf(p2);
    var len = Math.abs(offset1 - offset2);

    return len;
};

function tokenToPathDistance(token, path) {
    var n = 10;
    var maxdist = -1;
    for (var i = 0; i <= token.length; i += Math.max(token.length/n, 1/n)) {
        var tokenp = token.getPointAt(i);
        var nearestp = path.getNearestPoint(tokenp);
        var dist = tokenp.getDistance(nearestp);
        if (dist > maxdist)
            maxdist = dist;
    }
    return maxdist;
};

function chainCost(tokenchain) {
    return tokenchain.best_possible_cost;
};

function svgOnLoad(item, svgdata) {
    svgitem = item;
    tokens = [];
    item.fitBounds(paper.view.bounds);

    // Break all paths at intersections
    var childPaths = svgitem.getItems({class:'Path'});
    for (var i = 0; i < childPaths.length; i++) {
        var p1 = childPaths[i];
        for (var j = i+1; j < childPaths.length; j++) {
            // if (i == j) continue;
            // console.log("i = " + i + " j = " + j);
            var p2 = childPaths[j];
            // console.log("p1.getintersection(p2)")
            var crossings = p1.getIntersections(p2);
            for (var c = 0; c < crossings.length; c++) {
                p1.divideAt(crossings[c]);
                // console.log(crossings[c]);
            }
            crossings = p2.getIntersections(p1);
            for (var c = 0; c < crossings.length; c++) {
                p2.divideAt(crossings[c]);
                // console.log(crossings[c]);
            }
        }
    }

    var curves;
    for (var i = 0; i < childPaths.length; i++) {
        curves = childPaths[i].curves;
        for (var j = 0; j < curves.length; j++) {
            var curve = new paper.Curve(curves[j].segment1, curves[j].segment2);
            tokens.push(curve);
        }
        // tokens.push.apply(tokens, childPaths[i].curves);
    }
};

function clickSelect(svgitem, point) {
    if (!svgitem) return;
    var hitresult = svgitem.hitTest(point);
    if (hitresult) {
        hitresult.item.selected = true;
    }

    return [hitresult.item];
};

function pathSelect(svgitem, userStroke) {
    var startp = userStroke.firstSegment.point;
    // var tpoint = new paper.Path.Circle(startp, 5);
    // tpoint.strokeColor = 'blue';
    var partialchains = new BinaryHeap(chainCost);

    // Get all tokens close to startp and form partial chains
    var best_actual_cost = 1.0;
    var best_actual_chain = null;
    for (var i = 0; i < tokens.length; i++) {
        // console.log("i = " + i);
        var nearp = tokens[i].getNearestPoint(startp);
        // console.log("nearestp = " + nearp);
        var dist = nearp.getDistance(startp);
        // console.log("dist = " + dist);

        if (dist < maxdist) {
            var tchain = new TokenChain(userStroke);
            // console.log("addtoken");
            tchain.addToken(tokens[i], null);
            // console.log("added token");
            if (tchain.cost < best_actual_cost) {
                best_actual_cost = tchain.cost;
                best_actual_chain = tchain;
            }
            if (tchain.cost < 0.9) {
                partialchains.push(tchain);
            }
        }
    }

    makePath(best_actual_chain.tlist[0], {strokeColor:'red', strokeWidth:3, opacity: 0.5})
    console.log("best_actual_chain.cost: " + best_actual_chain.cost);
    console.log("length: " + best_actual_chain.length);
    console.log("curvespanned: " + best_actual_chain.curve_spanned_length);
    console.log("curvefrac: " + best_actual_chain.curvefrac);
    console.log("pathfrac: " + best_actual_chain.pathfrac);
    console.log("best_curvefrac: " + best_actual_chain.best_curvefrac);
    console.log("best_actual_chain.bestcost: " + best_actual_chain.best_possible_cost);

    var token = best_actual_chain.tlist[0];
    console.log("tindex " + token.index);
    var path = userStroke;
    var p1 = token.getNearestPoint(path.firstSegment.point);//path.getNearestPoint(token.segment1.point);
    console.log("tindex " + token.index);

    var offset1 = token.getLocationOf(p1);
    var p2 = token.getNearestPoint(path.lastSegment.point);
    console.log("tindex " + token.index);

    var offset2 = token.getLocationOf(p2);
    console.log("tokenlength: " + token.length);
    console.log("p1: " + p1 + " offset: " + offset1);
    console.log("p2: " + p2 + " offset: " + offset2);
    tpoint = new paper.Path.Circle(p1, 5);
    tpoint.strokeColor = 'red';

    tpoint = new paper.Path.Circle(p2, 5);
    tpoint.strokeColor = 'blue';


    // var len = Math.abs(offset1 - offset2);

    var bestchain = partialchains.pop();
    var debug = 0;
    while(bestchain && debug < 3) {
        // At each step grow the partialchain
        makePath(bestchain.tlist[0], {strokeColor:'green', strokeWidth:5})
        console.log("bestchain.cost: " + bestchain.cost);
        console.log("bestchain.curvefrac: " + bestchain.curvefrac);
        console.log("bestchain.pathfrac: " + bestchain.pathfrac);
        console.log("bestchain.bestcost: " + bestchain.best_possible_cost);
        if (bestchain.best_possible_cost >= best_actual_cost) {
            return best_actual_chain.tlist;
        }


        var connected = getConnectedTokens(bestchain);
        bestchain.tlist[0].selected = true;
        console.log("number of connected tokens: " + connected.length);
        for (var i = 0; i < connected.length; i++) {
            var newchain = bestchain.addToken(connected[i].token, connected[i].point);
            console.log("newchain.cost: " + newchain.cost);
            console.log("newchain.curvefrac: " + newchain.curvefrac);
            console.log("newchain.pathfrac: " + newchain.pathfrac);
            console.log("newchain.bestcost: " + newchain.best_possible_cost);

            if (i == 0) {
                makePath(connected[i].token, {strokeColor:'green', strokeWidth:5})
            } else if (i == 1) {
                makePath(connected[i].token, {strokeColor:'blue', strokeWidth:5})
            }
            if (newchain.best_possible_cost < best_actual_cost) {
                partialchains.push(newchain);
            }
            if (newchain.cost < best_actual_cost) {
                best_actual_chain = newchain;
                best_actual_cost = newchain.cost;
            }
        }
        bestchain = partialchains.pop();
        debug++;
    }
    if (!best_actual_chain) return;
    return best_actual_chain.tlist;
};

function getConnectedTokens(chain) {
    var connected = [];
    for (var i = 0; i < tokens.length; i++) {
        var p = chain.getConnectedPoint(tokens[i]);
        if (p) {
            connected.push({token:tokens[i],point:p});
        }
    }
    return connected;
};

function selectClosestToken(svgitem, userStroke) {
    // Compare UserStroke to Tokens in svgitem
    var minerror = Infinity;
    var closestToken;

    for (var i = 0; i < tokens.length; i++) {
        var error = comparePaths(tokens[i], userStroke);
        if (error < minerror) {
            minerror = error;
            closestToken = tokens[i];
        }
    }

    if (closestToken) {
        // closestToken.selected = true;
        var tokenpath = new paper.Path({
            segments: [closestToken.segment1, closestToken.segment2],
        });
        tokenpath.copyAttributes(closestToken.path);
        return [tokenpath];
    }
};

function comparePaths(candidatePath, userStroke) {
    // Uniformly sample n = 10 points from each stroke
    var n = 10;
    var psdists = [];
    for (var i = 0; i <= userStroke.length; i += userStroke.length / n) {
        var ps = userStroke.getPointAt(i);
        var cs = candidatePath.getNearestPoint(ps);
        var dist = ps.getDistance(cs);
        psdists.push(dist);
    }
    var psmean = math.mean(psdists);
    var psstd = math.std(psdists);

    var pcdists = [];
    for (var j = 0; j <= candidatePath.length; j += candidatePath.length / n) {
        var pc = candidatePath.getPointAt(j);
        var cs = userStroke.getNearestPoint(pc);
        var dist = pc.getDistance(cs);
        pcdists.push(dist);
    }
    var pcmean = math.mean(pcdists);
    var pcstd = math.mean(pcdists);

    var beta = 1.0;
    return beta * (psmean + pcmean) + (1 - beta) * (psstd + pcstd);


};

function makePath(token, style) {
    var path = new paper.Path({
        segments:[token.segment1, token.segment2]
    });
    path.style = style;
    return path;

};