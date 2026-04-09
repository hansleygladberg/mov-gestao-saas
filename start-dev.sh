#!/bin/sh
export PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH
cd /Users/hansley/DEV/mov-gestao-saas
exec node node_modules/.bin/next dev --port 3000
