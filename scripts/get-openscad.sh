#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
DIST_DIR=$SCRIPT_DIR/../dist
VENDOR_DIR=$SCRIPT_DIR/../src/vendor/openscad-wasm
OPENSCAD_WASM_URL=https://files.openscad.org/snapshots/OpenSCAD-2024.11.28.wasm21351-WebAssembly.zip  

mkdir -p $VENDOR_DIR
mkdir -p $DIST_DIR


wget $OPENSCAD_WASM_URL -O $VENDOR_DIR/openscad-wasm.zip
unzip $VENDOR_DIR/openscad-wasm.zip -d $VENDOR_DIR/
