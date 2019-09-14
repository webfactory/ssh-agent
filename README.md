# `ssh-agent` GitHub Action

This action 
* starts the `ssh-agent`, 
* exports the `SSH_AUTH_SOCK` environment variable, 
* loads a private SSH key into the agent and
* configures `known_hosts` for GitHub.com.

## Why?

When running a GitHub Action workflow to stage your project, run tests or build images, you might need to fetch additional libraries or _vendors_ from private repositories.

GitHub Actions only have access to the repository they run for. So, in order to access additional private repositories, create an SSH key with sufficient access privileges. Then, use this action to make the key available with `ssh-agent` on the Action worker node. Once this has been set up, `git clone` commands using `ssh` URLs will _just work_. Also, running `ssh` commands to connect to other servers will be able to use the key.

## Usage

1. Create an SSH key with sufficient access privileges. For security reasons, don't use your personal SSH key but set up a dedicated one for use in GitHub Actions. See below for a few hints if you are unsure about this step.
2. In your repository, go to the *Settings > Secrets* menu and create a new secret called `SSH_PRIVATE_KEY`. Put the *unencrypted private* SSH key in `PEM` format into the contents field. <br>
  This key should start with `-----BEGIN RSA PRIVATE KEY-----`, consist of many lines and ends with `-----END RSA PRIVATE KEY-----`. 
  You can just copy the key as-is from the private key file.
3. In your workflow definition file, add the following step. Preferably this would be rather on top, near the `actions/checkout@v1` line.

```yaml
# .github/workflows/my-workflow.yml
jobs:
    my_job:
        ...
        steps:
            - actions/checkout@v1
            - uses: webfactory/ssh-agent@v0.1
              with:
                  ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
            - ... other steps
```
4. If, for some reason, you need to change the location of the SSH agent socket, you can use the `ssh-auth-sock` input to provide a path.

## Known issues and limitations

### Works for the current job only

Since each job [runs in a fresh instance](https://help.github.com/en/articles/about-github-actions#job) of the virtual environment, the SSH key will only be available in the job where this action has been referenced. You can, of course, add the action in multiple jobs or even workflows. All instances can use the same `SSH_PRIVATE_KEY` secret.

### SSH private key format

If the private key is not in the `PEM` format, you will see an `Error loading key "(stdin)": invalid format` message.

Use `ssh-keygen -p -f path/to/your/key -m pem` to convert your key file to `PEM`, but be sure to make a backup of the file first 😉.

## Creating SSH keys

In order to create a new SSH key, run `ssh-keygen -t rsa -b 4096 -m pem -f path/to/keyfile`. This will prompt you for a key passphrase and save the key in `path/to/keyfile`.

Having a passphrase is a good thing, since it will keep the key encrypted on your disk. When configuring the secret `SSH_PRIVATE_KEY` value in your repository, however, you will need the private key *unencrypted*. 

To show the private key unencrypted, run `openssl rsa -in path/to/key -outform pem`.

## Authorizing a key

To actually grant the SSH key access, you can – on GitHub – use at least two ways:

* [Deploy keys](https://developer.github.com/v3/guides/managing-deploy-keys/#deploy-keys) can be added to individual GitHub repositories. They can give read and/or write access to the particular repository. When pulling a lot of dependencies, however, you'll end up adding the key in many places. Rotating the key probably becomes difficult.

* A [machine user](https://developer.github.com/v3/guides/managing-deploy-keys/#machine-users) can be used for more fine-grained permissions management and have access to multiple repositories with just one instance of the key being registered. It will, however, count against your number of users on paid GitHub plans.

## Hacking

As a note to my future self, in order to work on this repo:

* Clone it
* Run `npm install` to fetch dependencies
* _hack hack hack_
* `node index.js` (inputs are passed through `INPUT_` env vars, but how to set `ssh-private-key`?)
* Run `./node_modules/.bin/ncc build index.js` to update `dist/index.js`, which is the file actually run
* Read https://help.github.com/en/articles/creating-a-javascript-action if unsure.

## Credits, Copyright and License

This action was written by webfactory GmbH, Bonn, Germany. We're a software development
agency with a focus on PHP (mostly [Symfony](http://github.com/symfony/symfony)). If you're a 
developer looking for new challenges, we'd like to hear from you! 

- <https://www.webfactory.de>
- <https://twitter.com/webfactory>

Copyright 2019 webfactory GmbH, Bonn. Code released under [the MIT license](LICENSE).
