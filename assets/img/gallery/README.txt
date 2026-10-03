SMILE GALLERY IMAGES - THIS FOLDER STARTS EMPTY ON PURPOSE
==========================================================

The 87 before and after photographs are not in this zip. They are pulled straight
from the practice's current website, which cannot be reached from the machine that
built this site.

BEFORE YOU UPLOAD THE SITE, run the puller once.

On a Mac
    1. Open Terminal
    2. Type  cd  then a space, then drag the folder that contains index.html
       from Finder into the Terminal window, and press Return
    3. bash pull-gallery-images.sh

On Windows
    1. Open PowerShell
    2. cd into the folder that contains index.html
    3. powershell -ExecutionPolicy Bypass -File .\pull-gallery-images.ps1

Both scripts do the same thing: download all 87 images, resize them, and write
them here as WebP under the exact names smile-gallery.html asks for. Safe to run
again if one stops part way. Anything that fails is listed in
gallery-failures.csv. Add --force (Mac) or -Force (Windows) to redo everything.

Two files per case:
    <name>.webp      1400px wide, used when a visitor enlarges a photograph
    <name>-th.webp    700px wide, used in the grid

If this folder is still empty when the site goes live, the smile gallery page will
show 87 broken images.

Once the images are here, delete the tools/ folder the script created. It only
holds the downloaded originals and a copy of Google's WebP encoder.
