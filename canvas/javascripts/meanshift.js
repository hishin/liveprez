/**
 * Created by hijungshin on 2/24/17.
 */

var MIN_DISTANCE = 0.01;

var MeanShift = function() {

    this.cluster = function(points, kernel_bandwidth) {
        var shift_points = points.slice();
        var max_min_dist = 1;
        var iteration_number = 0;
        var still_shifting = new Array(points.length);
        still_shifting.fill(true);

        while( max_min_dist > MIN_DISTANCE) {
            console.log(iteration_number + ' ' + max_min_dist);
            max_min_dist = 0;
            iteration_number++;
            for (var i = 0; i < shift_points.length; i++) {
                if (!still_shifting[i])
                    continue;
                var p_new = shift_points[i];
                var p_new_start = p_new;
                p_new = this.shiftColor(p_new, points, kernel_bandwidth);

                var dist = colorDistance(p_new, p_new_start);
                if (dist > max_min_dist) {
                    max_min_dist = dist;
                }
                if (dist < MIN_DISTANCE) {
                    still_shifting[i] = false;
                }
                shift_points[i] = p_new;
            }
        }
        console.log(shift_points);
        return shift_points;
        // point_grouper = pg.PointGrouper()
        // group_assignments = point_grouper.group_points(shift_points.tolist())
        // return MeanShiftResult(points, shift_points, group_assignments)
    };

    this.shiftColor = function(color, colors, kernel_bandwidth) {
        var shifted_color = [0, 0, 0];
        var total_weight = 0;
        for (var i = 0; i < colors.length; i++) {
            var temp_color = colors[i];
            var distance = colorDistance(color, temp_color);
            var weight = kernel(distance, kernel_bandwidth);
            shifted_color[0] += temp_color[0] * weight;
            shifted_color[1] += temp_color[1] * weight;
            shifted_color[2] += temp_color[2] * weight;
            total_weight += weight;
        }
        shifted_color[0] /= total_weight;
        shifted_color[1] /= total_weight;
        shifted_color[2] /= total_weight;

        return shifted_color;
    };



};

function kernel(x, bandwidth) {
    var val = (1/(bandwidth*Math.sqrt(2*Math.PI))) * Math.exp(-0.5*(x*x)/(bandwidth*bandwidth));
    return val
};

function colorDistance(c1, c2) {
    return deltaRGB(c1, c2);
};