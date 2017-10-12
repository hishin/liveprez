var tokens;
var maxdist = 100;


var TokenChain = function(path) {
    this.path = path;
    this.tlist = [];
    this.totalfrac = 0.0;
    this.cost = 1.0;

    this.addToken = function(t, p) {
        if (!p) { // first token
            this.tlist.push(t);
            var frac = fractionSpanned(t, path);
            this.totalfrac += frac;
            var cfrac = 1-frac;
            var dist = tokenToPathDistance(t, path);
            var cdist = Math.min(1.0, dist/maxdist);
            this.cost -= (1.0 - cfrac)*(1.0 - cdist);
            this.best_possible_cost = this.cost - (1-this.totalfrac);

            this.p1 = t.point1;
            this.p2 = t.point2;
            this.c1 = t;
            this.c2 = t;
            return this;
        } else { // adding additional token
            var newchain = new TokenChain(this.path);
            newchain.tlist = this.tlist.slice(0, this.tlist.length);
            newchain.tlist.push(t);
            var frac = fractionSpanned(t, path);
            newchain.totalfrac = this.totalfrac + frac;
            var cfrac = 1-frac;
            var dist = tokenToPathDistance(t, path);
            var cdist = Math.min(1.0, dist/maxdist);
            newchain.cost = this.cost - (1.0 - cfrac)*(1.0 - cdist);
            newchain.best_possible_cost = newchain.cost - (1-newchain.totalfrac);

            if (this.p1.equals(p)) {
                if (t.point1.equals(p)) {
                    newchain.p1 = t.point2;
                } else {
                    newchain.p1 = t.point1;
                }
                newchain.c1 = t;
                newchain.p2 = this.p2;
                newchain.c2 = this.c2;
            } else if (this.p2.equals(p)) {
                if (t.point1.equals(p)) {
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
        if (t.point1.equals(this.p1) && t != this.c1) return t.point1;
        if (t.point1.equals(this.p2) && t != this.c2) return t.point1;
        if (t.point2.equals(this.p1) && t != this.c1) return t.point2;
        if (t.point2.equals(this.p2) && t != this.c2) return t.point2;
        return null;
    };
};

/**
 * return fraction p of path spanned by the token curve
 * @param token
 * @param path
 */
function fractionSpanned(token, path) {
    var p1 = path.getNearestPoint(token.segment1.point);
    var offset1 = path.getOffsetOf(p1);
    var p2 = path.getNearestPoint(token.segment2.point);
    var offset2 = path.getOffsetOf(p2);
    var frac = Math.abs(offset1 - offset2) / path.length;

    return frac;
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
        for (var j = 0; j < childPaths.length; j++) {
            if (i == j) continue;
            var p2 = childPaths[j];
            var crossings = p1.getIntersections(p2);
            for (var c = 0; c < crossings.length; c++) {
                p1.divideAt(crossings[c]);
            }
            crossings = p2.getIntersections(p1);
            for (var c = 0; c < crossings.length; c++) {
                p2.divideAt(crossings[c]);
            }
        }
    }

    for (var i = 0; i < childPaths.length; i++) {
        tokens.push.apply(tokens, childPaths[i].curves);
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
            if (tchain.cost < 0.75) {
                partialchains.push(tchain);
            }
        }
    }

    console.log('candidate size: ' + partialchains.size());
    var bestchain = partialchains.pop();
    var debug = 0;
    while(bestchain && debug < 5) {
        console.log("debug = " + debug);
        // At each step grow the partialchain
        if (bestchain.best_possible_cost >= best_actual_cost) {
            console.log("returning");
            return best_actual_chain.tlist;
        }
        var connected = getConnectedTokens(bestchain);
        bestchain.tlist[0].selected = true;
        console.log("num connected: " +  connected.length);
        for (var i = 0; i < connected.length; i++) {
            var newchain = bestchain.addToken(connected[i].token, connected[i].point);
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
    return best_actual_chain.tlist;
};

function getConnectedTokens(chain) {
    var connected = [];
    console.log("tokens.length: " + tokens.length);
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
        closestToken.selected = true;
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
