#!/bin/bash

git pull

npm run build

# Copy the draftfinder directory
cd  ../draftfinder 

# Remove the _dist directory if it exists
if [ -d "_dist" ]; then
    rm -r _dist
    echo "_dist directory removed"
else
    echo "_dist directory does not exist, skipping removal"
fi

# Rename the dist directory to _dist
if [ -d "dist" ]; then
    mv dist _dist
    echo "dist directory renamed to _dist"
else
    echo "dist directory does not exist, skipping rename"
fi

# Copy the dist directory from draftfinder-frontend
cp -r ../draftfinder-frontend/dist dist
echo "dist directory copied from draftfinder-frontend"

git pull

pm2 restart draftfinder

echo "Script execution completed."
