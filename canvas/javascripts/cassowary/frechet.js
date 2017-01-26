/**
 * Created by argelius
 * Downloaded from https://github.com/argelius/frechet
 * Modified by hijungshin on 1/25/17.
 */
function frechet(a, b) {

    if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new Error('Most lines must be arrays.');
    }

    if (a.length !== b.length) {
        throw new Error('Lines must be same length.');
    }

    const C = new Float32Array(a.length * b.length);
    const dim = a.length;

    C[0] = dist(a[0], b[0]);

    for (let j = 1; j < dim; j++) {
        C[j] = Math.max(C[j - 1], dist(a[0], b[j]));
    }

    for (let i = 1; i < dim; i++) {
        C[i * dim] = Math.max(C[(i - 1) * dim], dist(a[i], b[0]));
    }

    for (let i = 1; i < dim; i++) {
        for (let j = 1; j < dim; j++) {
            C[i * dim + j] = Math.max(
                Math.min(
                    C[(i - 1) * dim + j], C[(i - 1) * dim + j - 1],
                    C[i * dim + j - 1]),
                dist(a[i], b[j])
            );
        }
    }

    return C[C.length - 1];
};

function dist(p1, p2) {
    return Math.sqrt( Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};