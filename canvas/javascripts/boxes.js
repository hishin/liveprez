/**
 * Created by hijungshin on 8/20/16.
 */

var Cassowary = c.inherit({

    initialize: function() {
        this.solver = new c.SimplexSolver();
        this.rects = [];
        this.tl = []; // top-left
        this.br = []; // bottom-right
        var canvas = this.canvas = document.getElementById('current-canvas');
        this.width = canvas.offsetWidth;
        this.height = canvas.offsetHeight;
    },

    addRect: function(rect) {
        this.rects.push(rect);
        this.tl.push(new c.Point(rect.topLeft.x, rect.topLeft.y));
        this.br.push(new c.Point(rect.bottomRight.x, rect.bottomRight.y));
    },

    initConstraints: function() {
        //Add stay constraints for each point
        for (var i = 0; i < this.rects.length; i++) {
            this.solver.addPointStays([this.tl[i]]);
            this.solver.addPointStays([this.br[i]]);
        }

        // Add constraints to keep points inside window
        for (var i = 0; i < this.rects.length; i++) {
            this.solver.addConstraint(new c.Inequality(this.tl[i].x, c.GEQ, 0));
            this.solver.addConstraint(new c.Inequality(this.tl[i].y, c.GEQ, 0));
            this.solver.addConstraint(new c.Inequality(this.br[i].x, c.LEQ, this.width));
            this.solver.addConstraint(new c.Inequality(this.br[i].y, c.LEQ, this.height));
        }

    },

    solve: function() {
        // for (var i = 0; i < this.rects.length; i++) {
        //     this.solver.addEditVar(this.tl[i].x);
        //     this.solver.suggestValue(this.tl[i].x, this.tl[i].x);
        // }

        // this.solver.beginEdit();
        // this.solver.endEdit();
        this.solver.resolve();
    },

    getTopLeft: function() {
        var newtl = [];
        for (var i = 0; i < this.tl.length; i++)
        {

            newtl.push({x: this.tl[i].x.value, y: this.tl[i].y.value})
        }
        return newtl;
    },

    getBottomRight: function() {
        var newbr = [];
        for (var i = 0; i < this.br.length; i++)
        {

            newbr.push({x: this.br[i].x.value, y: this.br[i].y.value})
        }
        return newbr;
    },



});

function cassowarySolve(mypaper) {
    var cassowary = new Cassowary();
    var items = mypaper.project.activeLayer.getItems();
    for (var i = 0; i < items.length; i++) {
        cassowary.addRect(items[i].strokeBounds);
    }
    cassowary.initConstraints();
    cassowary.solve();
    console.log(cassowary.getTopLeft());
    console.log(cassowary.getBottomRight());

}
