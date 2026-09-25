#!/bin/bash

git pull

# Bricht bei einem fehlgeschlagenen Build ab - sonst würde unten der alte
# dist-Stand kopiert und das Update sähe erfolgreich aus.
if ! npm run build; then
    echo "Build fehlgeschlagen - draftfinder/dist bleibt unverändert."
    exit 1
fi

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
