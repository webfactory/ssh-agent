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
2. Make sure you don't have a passphrase set on the private key.
3. In your repository, go to the *Settings > Secrets* menu and create a new secret. In this example, we'll call it `SSH_PRIVATE_KEY`. Put the contents of the *private* SSH key file into the contents field. <br>
  This key should start with `-----BEGIN ... PRIVATE KEY-----`, consist of many lines and ends with `-----END ... PRIVATE KEY-----`. 
4. In your workflow definition file, add the following step. Preferably this would be rather on top, near the `actions/checkout@v1` line.

```yaml
# .github/workflows/my-workflow.yml
jobs:
    my_job:
        ...
        steps:
            - actions/checkout@v1
            # Make sure the @v0.4.1 matches the current version of the
            # action 
            - uses: webfactory/ssh-agent@v0.4.1
              with:
                  ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
            - ... other steps
```
5. If, for some reason, you need to change the location of the SSH agent socket, you can use the `ssh-auth-sock` input to provide a path.

### Using multiple keys

There are cases where you might need to use multiple keys. For example, "[deploy keys](https://docs.github.com/en/developers/overview/managing-deploy-keys#deploy-keys)" might be limited to a single repository, so you'll need several of them.

You can set up different keys as different secrets and pass them all to the action like so:

```yaml
# ... contens as before
            - uses: webfactory/ssh-agent@v0.4.1
              with:
                  ssh-private-key: |
                        ${{ secrets.FIRST_KEY }}
                        ${{ secrets.NEXT_KEY }}
                        ${{ secrets.ANOTHER_KEY }}
```

The `ssh-agent` will load all of the keys and try each one in order when establishing SSH connections.

There's one **caveat**, though: SSH servers may abort the connection attempt after a number of mismatching keys have been presented. So if, for example, you have
six different keys loaded into the `ssh-agent`, but the server aborts after five unknown keys, the last key (which might be the right one) will never even be tried. 

Also, when using **Github deploy keys**, GitHub servers will accept the first known key. But since deploy keys are scoped to a single repository, you might get the error message `fatal: Could not read from remote repository. Please make sure you have the correct access rights and the repository exists.` if the wrong key/repository combination is tried.

In both cases, you might want to [try a wrapper script around `ssh`](https://gist.github.com/mpdude/e56fcae5bc541b95187fa764aafb5e6d) that can pick the right key, based on key comments. See [our blog post](https://www.webfactory.de/blog/using-multiple-ssh-deploy-keys-with-github) for the full story.

## Exported variables
The action exports the `SSH_AUTH_SOCK` and `SSH_AGENT_PID` environment variables through the Github Actions core module.
The `$SSH_AUTH_SOCK` is used by several applications like git or rsync to connect to the SSH authentication agent.
The `$SSH_AGENT_PID` contains the process id of the agent. This is used to kill the agent in post job action.

## Known issues and limitations

### Currently OS X and Linux only

This action has not been tested for the Windows virtual environment. If you can provide the steps necessary to setup (even install?) OpenSSH on the Windows machine, please open an issue. 

### Works for the current job only

Since each job [runs in a fresh instance](https://help.github.com/en/articles/about-github-actions#job) of the virtual environment, the SSH key will only be available in the job where this action has been referenced. You can, of course, add the action in multiple jobs or even workflows. All instances can use the same `SSH_PRIVATE_KEY` secret.

### SSH private key format

If the private key is not in the `PEM` format, you will see an `Error loading key "(stdin)": invalid format` message.

Use `ssh-keygen -p -f path/to/your/key -m pem` to convert your key file to `PEM`, but be sure to make a backup of the file first 😉.

## What this Action *cannot* do for you

The following items are not issues, but beyond what this Action is supposed to do.

### Work on remote machines

When using `ssh` to connect from the GitHub Action worker node to another machine, you *can* forward the SSH Agent socket and use your private key on the other (remote) machine. However, this Action will not configure `known_hosts` or other SSH settings on the remote machine for you.

### Provide the SSH key as a file

This Action is designed to pass the SSH key directly into `ssh-agent`; that is, the key is available in memory on the GitHub Action worker node, but never written to disk. As a consequence, you _cannot_ pass the key as a build argument or a mounted file into Docker containers that you build or run on the worker node. You _can_, however, mount the `ssh-agent` Unix socket into a Docker container that you _run_, set up the `SSH_AUTH_SOCK` env var and then use SSH from within the container (see #11).

### Run `ssh-keyscan` to add host keys for additional hosts

If you want to use `ssh-keyscan` to add additional hosts (that you own/know) to the `known_hosts` file, you can do so with a single shell line in your Action definition. You don't really need this Action to do this for you.

As a side note, using `ssh-keyscan` without proper key verification is susceptible to man-in-the-middle attacks. You might prefer putting your _known_ SSH host key in your own Action files to add it to the `known_hosts` file. The SSH host key is not secret and can safely be committed into the repo. 

## Creating SSH keys

In order to create a new SSH key, run `ssh-keygen -t ed25519 -a 100 -f path/to/keyfile`, as suggested in [this blog post](https://stribika.github.io/2015/01/04/secure-secure-shell.html). 
If you need to work with some older server software and need RSA keys, tr `ssh-keygen -t rsa -b 4096 -o -f path/to/keyfile` instead.

Both commands will prompt you for a key passphrase and save the key in `path/to/keyfile`.
In general, having a passphrase is a good thing, since it will keep the key encrypted on your disk. When using the key with this action, however, you need to make sure you don't 
specify a passphrase: The key must be usable without reading the passphrase from input. Since the key itself is stored using GitHub's "Secret" feature, it should be fairly safe anyway.

## Authorizing a key

To actually grant the SSH key access, you can – on GitHub – use at least two ways:

* [Deploy keys](https://developer.github.com/v3/guides/managing-deploy-keys/#deploy-keys) can be added to individual GitHub repositories. They can give read and/or write access to the particular repository. When pulling a lot of dependencies, however, you'll end up adding the key in many places. Rotating the key probably becomes difficult. The deploy key needs to be added to the private repository that is being fetched as a private dependency.

* A [machine user](https://developer.github.com/v3/guides/managing-deploy-keys/#machine-users) can be used for more fine-grained permissions management and have access to multiple repositories with just one instance of the key being registered. It will, however, count against your number of users on paid GitHub plans.

## Hacking

As a note to my future self, in order to work on this repo:

* Clone it
* Run `yarn install` to fetch dependencies
* _hack hack hack_
* `node index.js`. Inputs are passed through `INPUT_` env vars with their names uppercased.

  On *nix use:
  ```bash
  env "INPUT_SSH-PRIVATE-KEY=\`cat file\`" node index.js
  ```

  On Windows (cmd):
  ```cmd
  set /P INPUT_SSH-PRIVATE-KEY=< file
  node index.js
  ```

  On Windows (PowerShell):
  ```ps
  ${env:INPUT_SSH-PRIVATE-KEY} = (Get-Content .\test-keys -Raw); node index.js
  node index.js
  ```
* Run `npm run build` to update `dist/*`, which holds the files actually run
* Read https://help.github.com/en/articles/creating-a-javascript-action if unsure.
* Maybe update the README example when publishing a new version.

## Credits, Copyright and License

This action was written by webfactory GmbH, Bonn, Germany. We're a software development
agency with a focus on PHP (mostly [Symfony](http://github.com/symfony/symfony)). If you're a 
developer looking for new challenges, we'd like to hear from you! 

- <https://www.webfactory.de>
- <https://twitter.com/webfactory>

Copyright 2019 – 2020 webfactory GmbH, Bonn. Code released under [the MIT license](LICENSE).
