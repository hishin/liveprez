
function KMeans(centroids) {
    this.centroids = centroids || [];
}

KMeans.prototype.determineCentroids = function(b, maxk, data) {
    // assign colors into b*b*b bins in RGB space
    var hist = new Array(b*b*b).fill(0);
    var lmeans = new Array(b*b*b).fill(0);
    var ameans = new Array(b*b*b).fill(0);
    var bmeans = new Array(b*b*b).fill(0);
    var cents = [];
    var ri, gi, bi;
    var mod = 256/b;
    for (var i = 0; i < data.length; i+=4) {
        ri = Math.trunc(data[i]/mod);
        gi = Math.trunc(data[i+1]/mod);
        bi = Math.trunc(data[i+2]/mod);
        // Flat[x + WIDTH * (y + DEPTH * z)] = Original[x, y, z]
        var id = (b*b*ri)+(b*gi)+bi;
        hist[id]++;
        var rgb = [data[i], data[i+1], data[i+2]];
        var lab = rgb2lab(rgb);
        lmeans[id] += lab[0];
        ameans[id] += lab[1];
        bmeans[id] += lab[2];
    }
    for (var i = 0; i < lmeans.length; i++ ) {
        if (hist[i] == 0) continue;
        lmeans[i] /= hist[i];
        ameans[i] /= hist[i];
        bmeans[i] /= hist[i];
    }
    var finished = false;
    while (cents.length < maxk && !finished) {
        var idx = hist.indexOf(Math.max.apply(null, hist));
        // find the mean
        var maxlab = [lmeans[idx], ameans[idx], bmeans[idx]];
        var meanrgb = lab2rgb(maxlab);

        // find min dist to existing centroid
        var mindist = Infinity;
        for (var i = 0; i < cents.length; i++) {
            var dist = deltaE(maxlab, rgb2lab(cents[i]));
            if (dist < mindist) {
                mindist = dist;
            }
        }
        if (mindist < 20) {
            finished = true;
            continue;
        } else {

        }
        cents.push(meanrgb);
        // remove max
        hist.splice(idx, 1);
        lmeans.splice(idx, 1);
        ameans.splice(idx, 1);
        bmeans.splice(idx, 1);
        // attenuate
        var labdist, ilab, irgb;
        for (var i = 0; i < hist.length; i++) {
            ilab = [lmeans[i], ameans[i], bmeans[i]];
            // irgb = lab2rgb(ilab);
            labdist = deltaE(maxlab, ilab);
            hist[i] *= (1.0 - Math.exp(-labdist*labdist/(100*100)));
        }
    }
    this.centroids = cents;
    return cents;
}

KMeans.prototype.randomCentroids = function(points, k) {
    var centroids = points.slice(0); // copy
    centroids.sort(function() {
        return (Math.round(Math.random()) - 0.5);
    });
    return centroids.slice(0, k);
}

KMeans.prototype.classify = function(point) {
    var min = Infinity,
        index = 0;

    for (var i = 0; i < this.centroids.length; i++) {
        var dist = distance(point, this.centroids[i]);
        if (dist < min) {
            min = dist;
            index = i;
        }
    }

    return index;
}

KMeans.prototype.cluster = function(points, k, snapshotPeriod, snapshotCb) {
    k = k || Math.max(2, Math.ceil(Math.sqrt(points.length / 2)));

    if (this.centroids.length == 0)
        this.centroids = this.randomCentroids(points, k);

    var assignment = new Array(points.length);
    var clusters = new Array(k);

    var iterations = 0;
    var movement = true;
    while (movement) {
        // update point-to-centroid assignments
        for (var i = 0; i < points.length; i++) {
            assignment[i] = this.classify(points[i]);
        }

        // update location of each centroid
        movement = false;
        for (var j = 0; j < k; j++) {
            var assigned = [];
            for (var i = 0; i < assignment.length; i++) {
                if (assignment[i] == j) {
                    assigned.push(points[i]);
                }
            }

            if (!assigned.length) {
                continue;
            }

            var centroid = this.centroids[j];
            var newCentroid = new Array(centroid.length);

            for (var g = 0; g < centroid.length; g++) {
                var sum = 0;
                for (var i = 0; i < assigned.length; i++) {
                    sum += assigned[i][g];
                }
                newCentroid[g] = sum / assigned.length;

                if (newCentroid[g] != centroid[g]) {
                    movement = true;
                }
            }

            this.centroids[j] = newCentroid;
            clusters[j] = assigned;
        }

        if (snapshotCb && (iterations++ % snapshotPeriod == 0)) {
            snapshotCb(clusters);
        }
    }

    return clusters;
}

KMeans.prototype.toJSON = function() {
    return JSON.stringify(this.centroids);
}

KMeans.prototype.fromJSON = function(json) {
    this.centroids = JSON.parse(json);
    return this;
}

// euclidean distance
function distance(v1, v2) {
    var total = 0;
    for (var i = 0; i < v1.length; i++) {
        total += Math.pow(v2[i] - v1[i], 2);
    }
    return Math.sqrt(total);
};