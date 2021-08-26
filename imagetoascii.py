from pathlib import WindowsPath
from PIL import Image

#ascii characters
ASCII_CHARS = ["@", "#", "S", "%", "?", "*", "+", ";", ":", ",", "."]

#resize image according to new width
def resize_image(image, new_width=100):
    width, height = image.size
    ratio = height / width
    new_height = int(new_width * ratio)
    resized_image = image.resize((new_width, new_height))
    return(resized_image)

#convert to grayscale
def grayify(image):
    grayscale_image = image.convert("L")
    return(grayscale_image)

#convert pixel to a string of ASCII
def pixel_to_ascii(image):
    pixels = image.getdata()
    characters = "".join([ASCII_CHARS[pixel//25] for pixel in pixels])
    return(characters)



def main(new_width=100):
    #attempt to open from input
    path = input("Enter a valid path to an image: \n")
    try:
        image = PIL.Image.open(path)
    except:
        print(path, "is not valid pathname to image.")
        
    #convert to ascii
    new_image_data = pixel_to_ascii(grayify(resize_image(image)))

    #format
    pixel_count = len(new_image_data)
    ascii_image = "\n".join(new_image_data[i:(i+new_width)] for i in range(0, pixel_count, new_width))

    #print result
    print(ascii_image)

    #print result
    with open("ascii_image.txt", "w") as f:
        f.write(ascii_image)

main()
