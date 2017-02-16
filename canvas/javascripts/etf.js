/**
 * Created by hijungshin on 2/16/17.
 */

function xyOffset(imgdata, x, y) {
    return (y*imgdata.width + x) * 4;
};

function tangent(sobel, x, y) {
    var i = xyOffset(sobel, x, y);
    var dx = sobel.data[i];
    var dy = sobel.data[i+1];
    var mag = sobel.data[i+2];
    return [dy, dx, mag];
};

function newTangent(praster, sobel, px, py, r) {
    var minx = Math.max(0, px-r);
    var maxx = Math.min(sobel.width, px + r+1);
    var miny = Math.max(0, py-r);
    var maxy = Math.min(sobel.height, py + r+1);
    var sumtx = 0.0;
    var sumty = 0.0;
    var tx = tangent(sobel, px, py);
    var ty, wm, wd, rho;
    var k = 0;
    // console.log("minx: " + minx + ", maxx: " + maxx + ", px: " + px);
    // console.log("miny: " + miny + ", maxy: " + maxy + ", px: " + py);

    for (var x = minx; x < maxx; x++) {
        for (var y = miny; y < maxy; y++) {
            ty = tangent(sobel, x, y);
            wm = weightM(tx, ty);
            wd = weightD(tx, ty);
            rho = signOf(tx, ty);
            if (wm > 0 && wd > 0) {
                sumtx += rho * ty[0] * wm * wd;
                sumty += rho * ty[1] * wm * wd;
                k += 1;
            } else {
                console.log("wm: " + wm + " wd: " + wd);
                console.log("ty: " + ty[0] + " " + ty[1] + " " + ty[2]);
                console.log("tx: " + tx[0] + " " + tx[1] + " " + tx[2]);

            }
        }
    }
    // console.log(k);
    // console.log(sumtx);
    if (sumtx == 0 && sumty == 0 && k == 0) {
        return [-1,-1];
    }
    else {
        return tx;
    }
    var newt = [sumtx/k, sumty/k]
    return newt;
};

function weightM(tx, ty) {
    var gx = tx[2];
    var gy = ty[2];
    if (gy == 0) { // if neighbor has 0 tangent
        return -1;
    }
    return 0.5 * (1 + Math.tanh(gy - gx));
};

function weightD(tx, ty) {
    if (ty[2] == 0) { // if neighbor has tnagent 0
        return 0;
    }
    if (tx[2] == 0) { // if current pixel has no tangent
        return 1.0;
    }
    return Math.abs(tx[0]*ty[0] + tx[1]*ty[1]);
};

function signOf(tx, ty) {
    if (tx[0]*ty[0] + tx[1]*ty[1] >= 0)
        return 1;
    else return -1;
};

function isBackground(praster, x, y) {
    var color = praster.getPixel(x,y);
    var dr = Math.abs(praster.bgcolor.red - color.red);
    var dg = Math.abs(praster.bgcolor.green - color.green);
    var db = Math.abs(praster.bgcolor.blue - color.blue);
    if (dr + dg + db < 0.2)
        return true;
    return false;
}

function edgeTangentFlow(praster, r) {
    var raster = praster.getImageData(new paper.Rectangle(0, 0, praster.width, praster.height));
    var sobel = Filters.sobel(raster);
    var etf = Filters.createImageData(praster.width, praster.height);
    var newt, offset, color, colordiff, dr, dg, db, t;
    for (var x = 0; x < sobel.width; x++) {
        for (var y = 0; y < sobel.height; y++) {

            var minx = Math.max(0, x-r);
            var maxx = Math.min(sobel.width, x + r+1);
            var miny = Math.max(0, y-r);
            var maxy = Math.min(sobel.height, y + r+1);

            offset = xyOffset(sobel, x, y);
            if (isBackground(praster, x, y))
                newt = [0,0];
            else
                newt = newTangent(praster, sobel, x, y, r);
            // newt = [sobel.data[offset], sobel.data[offset+1]];//newTangent(praster, sobel, x,y, r);
            if (newt[0] == -1 && newt[1] == -1 ) {
                var rect = new paper.Path.Rectangle(minx/scale, miny/scale, (maxx-minx)/scale, (maxy-miny)/scale);
                rect.strokeColor = 'blue';
                rect.strokeWidth = 1.0;
            }
            etf.data[offset+0] = newt[0];
            etf.data[offset+1] = newt[1];
            etf.data[offset+2] = Math.sqrt(newt[0]*newt[0] + newt[1]*newt[1]);
        }
    }
    return etf;
};