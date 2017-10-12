var tokens;
var maxdist = 100;


var TokenChain = function(token, path) {
    this.tlist = [token];
    this.path = path;
    this.frac = fractionSpanned(token, path);
    this.dist = tokenToPathDistance(token, path);
    this.score = (this.frac * this.dist) + (1-this.frac) * maxdist;
    this.best_possible_score = this.frac * this.dist;

    this.addToken = function(t) {
        this.tlist.push(t);
        var frac = fractionSpanned(t, this.path);
        var dist = tokenToPathDistance(t, this.path);
        this.frac += frac;
        this.dist = Math.max(this.dist, dist);
        this.score = (this.frac * this.dist) + (1-this.frac)*maxdist;
        this.best_possible_score = this.frac * this.dist;
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
    for (var i = 0; i <= token.length; i += token.length / n) {
        var tokenp = token.getPointAt(i);
        var nearestp = path.getNearestPoint(tokenp);
        var dist = tokenp.getDistance(nearestp);
        if (dist > maxdist)
            maxdist = dist;
    }
    return maxdist;
};

function chainScore(tokenchain) {
    return tokenchain.best_possible_score;
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
    var partialchains = BinaryHeap(chainScore);

    // Get all tokens close to startp and form partial chains
    for (var i = 0; i < tokens.length; i++) {
        var nearp = tokens[i].getNearestPoint(startp);
        var dist = nearp.getDistance(startp);
        if (dist < maxdist) {
            var tchain = TokenChain(tokens[i], userStroke);
            partialchains.push(tchain);
        }
    }

    while() {
        var bestchain = partialchains.pop();
        // grow chain by adding tokens
        var connected = getConnectedTokens(token);
        for (var c = 0; c < connected.length; c++) {
            // should return a new partial chain
            bestchain.addToken(connected[c]);
            partialchains.push(bestchain);
        }

    }

};

function getConnectedTokens(token) {

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
