var imageData = ctx.getImageData(0, 0, 500, 500),
    data = imageData.data,
    len = data.length;

for (var i = 0; i < len; i += 4){
    data[i] = buffer[i];
    data[i + 1] = buffer[i + 1];
    data[i + 2] = buffer[i + 2];
}

ctx.putImageData(imageData, 0, 0);






pixelStack = [[startX, startY]];

while(pixelStack.length)
{
    var newPos, x, y, pixelPos, reachLeft, reachRight;
    newPos = pixelStack.pop();
    x = newPos[0];
    y = newPos[1];

    pixelPos = (y*canvasWidth + x) * 4;
    while(y-- >= drawingBoundTop && matchStartColor(pixelPos))
    {
        pixelPos -= canvasWidth * 4;
    }
    pixelPos += canvasWidth * 4;
    ++y;
    reachLeft = false;
    reachRight = false;
    while(y++ < canvasHeight-1 && matchStartColor(pixelPos))
    {
        colorPixel(pixelPos);

        if(x > 0)
        {
            if(matchStartColor(pixelPos - 4))
            {
                if(!reachLeft){
                    pixelStack.push([x - 1, y]);
                    reachLeft = true;
                }
            }
            else if(reachLeft)
            {
                reachLeft = false;
            }
        }

        if(x < canvasWidth-1)
        {
            if(matchStartColor(pixelPos + 4))
            {
                if(!reachRight)
                {
                    pixelStack.push([x + 1, y]);
                    reachRight = true;
                }
            }
            else if(reachRight)
            {
                reachRight = false;
            }
        }

        pixelPos += canvasWidth * 4;
    }
}