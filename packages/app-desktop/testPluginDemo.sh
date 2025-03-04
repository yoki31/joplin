#!/bin/bash

# This is a convenient way to build and test a plugin demo.
# It could be used to develop plugins too.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PLUGIN_PATH="$SCRIPT_DIR/../app-cli/tests/support/plugins/toc"
yarn i --prefix="$PLUGIN_PATH" && yarn start -- --dev-plugins "$PLUGIN_PATH"