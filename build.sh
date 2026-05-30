#!/bin/bash
set -e

echo "Building NEXRA full site..."

# Create clean distribution directory
rm -rf dist
mkdir dist

# 1. Copy Landing Page to the root of dist
echo "Copying landing page..."
cp -R nexra-landing/* dist/

# 2. Copy Dashboard to dist/app
echo "Copying dashboard..."
mkdir -p dist/app
cp -R nexra-dashboard/. dist/app/

echo "Build complete! Output is in the 'dist' folder."
