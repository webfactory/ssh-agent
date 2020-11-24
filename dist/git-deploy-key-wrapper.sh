#!/bin/bash

# The last argument is the command to be executed on the remote end, which is something
# like "git-upload-pack 'webfactory/ssh-agent.git'". We need the repo path only, so we
# Terraform ends up bing "git-upload-pack '/webfactory/ssh-agent.git'"
# loop over this last argument to get the last part of if.
for last in ${!#}; do :; done

# Don't use "exec" to run "ssh" below; then the trap won't work.
key_file=$(mktemp -u)
trap "rm -f $key_file" EXIT

eval last=$last

# Try to pick the right key
# No "--word-regexp" because Terraforms usage of git ends up as
# "git-upload-pack '/webfactory/ssh-agent.git'". "--word-regexp" will not match it.
# Other integrations still work without "--word-regexp"
ssh-add -L | grep --max-count=1 $last > $key_file

ssh -i $key_file "$@"
