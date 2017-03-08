/**
 * Created by Valentina on 2/21/2017.
 * Code from https://github.com/parmanoir/Meijster-distance
 * input booleanImage = new Array(m*n), binary 0 or 1
 * return dt = new Array(m*n)
 */

function distanceTransform(booleanImage, m, n, method) {
    // First phase
    var infinity = m+n;
    var b = booleanImage;
    var g = new Array(m*n);
    var cj = new Array(m*n); // to store the closest pixel
    for (var x=0; x<m; x++)	{ // for each column
        if (b[x+0*m]) {
            g[x+0*m] = 0;
            cj[x+0*m] = 0;
        }
        else {
            g[x+0*m] = infinity;
            cj[x+0*m] = -1;
        }
        // Scan 1
        for (var y=1; y<n; y++)	{
            if (b[x+y*m]) {
                g[x+y*m] = 0;
                cj[x+y*m] = y;
            }
            else {
                g[x+y*m] = 1 + g[x+(y-1)*m];
                // cj[x+y*m] = cj[x+(y-1)*m];
            }
        }
        // Scan 2
        for (var y=n-1; y>= 0; y--)	{
            if (g[x+(y+1)*m] < g[x+y*m]) {
                g[x+y*m] = 1 + g[x+(y+1)*m];
                cj[x+y*m] = cj[x+(y+1)*m];
            }
        }
    }
    // Euclidean
    function EDT_f(x, i, g_i) {
        return (x-i)*(x-i) + g_i*g_i;
    }
    function EDT_Sep(i, u, g_i, g_u) {
        return Math.floor((u*u - i*i + g_u*g_u - g_i*g_i)/(2*(u-i)));
    }
    // Manhattan
    function MDT_f(x, i, g_i) {
        return Math.abs(x-i) + g_i
    }
    function MDT_Sep(i, u, g_i, g_u) {
        if (g_u >= (g_i + u - i))
            return infinity;
        if (g_i > (g_u + u - i))
            return -infinity;
        return Math.floor((g_u - g_i + u + i)/2);
    }
    // Chessboard
    function CDT_f(x, i, g_i) {
        return Math.max(Math.abs(x-i), g_i);
    }
    function CDT_Sep(i, u, g_i, g_u) {
        if (g_i <= g_u)
            return Math.max(i+g_u, Math.floor((i+u)/2));
        else
            return Math.min(u-g_i, Math.floor((i+u)/2));
    }
    // Second phase
    var ci = new Array(m*n); // to store closest pixel
    var f	= eval(method + '_f');
    var Sep	= eval(method + '_Sep');
    var dt	= new Array(m*n);
    var s	= new Array(m);
    var t	= new Array(m);
    var q	= 0;
    var w;
    for (var y=0; y<n; y++)	{
        q = 0;
        s[0] = 0;
        t[0] = 0;

        // Scan 3
        for (var u=1; u<m; u++)	{
            while (q >= 0 && f(t[q], s[q], g[s[q]+y*m]) > f(t[q], u, g[u+y*m]))
                q--;
            if (q < 0)	{
                q = 0;
                s[0] = u;
            }	else	{
                w = 1 + Sep(s[q], u, g[s[q]+y*m], g[u+y*m]);
                if (w < m)	{
                    q++;
                    s[q] = u;
                    t[q] = w;
                }
            }
        }
        // Scan 4
        for (u=m-1; u>=0; u--)	{
            var d = f(u, s[q], g[s[q]+y*m]);
            if (method == 'EDT')
                d = Math.floor(Math.sqrt(d));
            ci[u+y*m] = s[q];
            cj[u+y*m] = y; // this is wrong
            dt[u+y*m] = d;
            if (u == t[q])
                q--;
        }
    }
    return [dt, ci, cj];
};
