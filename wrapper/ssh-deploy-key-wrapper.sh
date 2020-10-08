#!/bin/bash

# The last argument is the command to be executed on the remote end, which is something
# like "git-upload-pack 'webfactory/ssh-agent.git'". We need the repo path only, so we
# loop over this last argument to get the last part of if.
for last in ${!#}; do :; done

# Don't use "exec" to run "ssh" below; then the trap won't work.
key_file=$(mktemp -u)
trap "rm -f $key_file" EXIT

eval last=$last

# Try to pick the right key
ssh-add -L | grep --word-regexp --max-count=1 $last > $key_file

ssh -i $key_file "$@"