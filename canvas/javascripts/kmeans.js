
function KMeans(centroids) {
    this.centroids = centroids || [];
}

KMeans.prototype.determineCentroids = function(b, data) {
    console.log(data.length/4);
    // assign colors into b*b*b bins in RGB space
    var hist = new Uint32Array(b*b*b);
    var ri, gi, bi;
    var mod = 256/b;
    for (var i = 0; i < data.length; i+=4) {
        ri = Math.trunc(data[i]/mod);
        gi = Math.trunc(data[i+1]/mod);
        bi = Math.trunc(data[i+2]/mod);
        // Flat[x + WIDTH * (y + DEPTH * z)] = Original[x, y, z]
        var id = (b*b*ri)+(b*gi)+bi;
        hist[id]++;

    }
    var idx = hist.indexOf(Math.max.apply(null, hist));

    var maxb = Math.trunc(idx % b);
    var maxg = Math.trunc((idx/b)%b);
    var maxr = Math.trunc(idx/(b*b));
    var sum = hist.reduce(function(acc, val) {
        return acc + val;
    }, 0);
    console.log(maxr + " " + maxg + " " + maxb);
    console.log(hist);
    console.log(sum);
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