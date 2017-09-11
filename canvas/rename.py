'''
Created on Aug 28, 2017

@author: hijungshin
'''
import sys
from PIL import Image, ImageChops,ImageStat, ImageOps
import glob
import os

def subtractbg(fgim, bgim):

    diff = ImageChops.difference(fgim, bgim)
    result = invertimage(diff)
    result.putalpha(255)
    newData = []
    datas = result.getdata()
    for item in datas:
        if item[0] == 255 and item[1] == 255 and item[2] == 255:
            newData.append((0,0,0,0))
        else:
            newData.append((item[0], item[1], item[2], 255))
    result.putdata(newData)
    return result

def invertimage(image):
    if image.mode == 'RGBA':
        r,g,b,a = image.split()
        rgb_image = Image.merge('RGB', (r,g,b))
        inverted_image = ImageOps.invert(rgb_image)
        r2,g2,b2 = inverted_image.split()
        final_image = Image.merge('RGBA', (r2,g2,b2,a))
    else:
        final_image = ImageOps.invert(image)
    return final_image    

if __name__ == "__main__":
    slidedir = sys.argv[1]
    rename_dir = slidedir+'/rename'
    image_list = []
    for filename in glob.glob(slidedir+'/*.png'): #assuming png
        im=Image.open(filename)
        im.filename = filename
        image_list.append(im)

    if not os.path.exists(rename_dir): #make directory
        os.makedirs(rename_dir)
    else: # clear the directory
        for the_file in os.listdir(rename_dir):
            file_path = os.path.join(rename_dir, the_file)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(e)

    bgim = None
    slide_count = 1
    for im in image_list:
        if bgim != None:
            diff = ImageChops.subtract(im, bgim)
            sum_diff = sum(ImageStat.Stat(diff).sum)
            if (sum_diff == 0.0): # im is a foreground layer
                diff = subtractbg(im, bgim)
                diff.save(rename_dir + '/slide'+'{:04d}'.format(slide_count)+'.1.png')
            else: # im is a new slide background
                slide_count += 1    
                im.save(rename_dir + '/slide'+'{:04d}'.format(slide_count)+'.0.png')
                bgim = im
        else: # first slide must be background
            im.save(rename_dir + '/slide'+'{:04d}'.format(slide_count)+'.0.png')
            bgim = im
        
        