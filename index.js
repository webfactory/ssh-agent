const core = require('@actions/core');
const child_process = require('child_process');
const fs = require('fs');
const os = require('os');

// Param names
const privateKeyName = 'ssh-private-key';
const repoMappingsName = 'repo-mappings';
const authSockName = 'ssh-auth-sock';
const dropExtraHeaderName = 'drop-extra-header';

try {

    const home = os.homedir();
    const homeSsh = home + '/.ssh';
    const sshConfig = homeSsh + '/config';
    const sshKnownHosts = homeSsh + '/known_hosts';

    const privateKey = core.getInput(privateKeyName);

    if (!privateKey) {
        core.setFailed(`The ${privateKeyName} argument is empty. Maybe the secret has not been configured, or you are using a wrong secret name in your workflow file.`);

        return;
    }

    console.log(`Adding GitHub.com keys to ${sshKnownHosts}`);
    fs.mkdirSync(homeSsh, { recursive: true });
    fs.appendFileSync(sshKnownHosts, '\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n');
    fs.appendFileSync(sshKnownHosts, '\ngithub.com ssh-dss AAAAB3NzaC1kc3MAAACBANGFW2P9xlGU3zWrymJgI/lKo//ZW2WfVtmbsUZJ5uyKArtlQOT2+WRhcg4979aFxgKdcsqAYW3/LS1T2km3jYW/vr4Uzn+dXWODVk5VlUiZ1HFOHf6s6ITcZvjvdbp6ZbpM+DuJT7Bw+h5Fx8Qt8I16oCZYmAPJRtu46o9C2zk1AAAAFQC4gdFGcSbp5Gr0Wd5Ay/jtcldMewAAAIATTgn4sY4Nem/FQE+XJlyUQptPWMem5fwOcWtSXiTKaaN0lkk2p2snz+EJvAGXGq9dTSWHyLJSM2W6ZdQDqWJ1k+cL8CARAqL+UMwF84CR0m3hj+wtVGD/J4G5kW2DBAf4/bqzP4469lT+dF2FRQ2L9JKXrCWcnhMtJUvua8dvnwAAAIB6C4nQfAA7x8oLta6tT+oCk2WQcydNsyugE8vLrHlogoWEicla6cWPk7oXSspbzUcfkjN3Qa6e74PhRkc7JdSdAlFzU3m7LMkXo1MHgkqNX8glxWNVqBSc0YRdbFdTkL0C6gtpklilhvuHQCdbgB3LBAikcRkDp+FCVkUgPC/7Rw==\n');

    console.log("Starting ssh-agent");
    const authSock = core.getInput(authSockName);
    let sshAgentOutput = ''
    if (authSock && authSock.length > 0) {
        sshAgentOutput = child_process.execFileSync('ssh-agent', ['-a', authSock]);
    } else {
        sshAgentOutput = child_process.execFileSync('ssh-agent')
    }

    // Extract auth socket path and agent pid and set them as job variables
    const lines = sshAgentOutput.toString().split("\n")
    for (const lineNumber in lines) {
        const matches = /^(SSH_AUTH_SOCK|SSH_AGENT_PID)=(.*); export \1/.exec(lines[lineNumber])
        if (matches && matches.length > 0) {
            core.exportVariable(matches[1], matches[2])
        }
    }

    // Do we need to drop the http.extraheader added by actions/checkout@v2?
    const dropExtraHeader = (core.getInput(dropExtraHeaderName).toLowerCase() === 'true');
    if (dropExtraHeader) {
        console.log("Dropping any existing http.extraheader git config");
        child_process.execSync(`git config --global http.https://github.com/.extraheader ''`);
    }

    // Grab the repo mappings
    console.log("Parsing repo mappings");
    const repoMappingsInput = core.getInput(repoMappingsName);
    let repoMappings = null;
    if (repoMappingsInput) {
        repoMappings = new Array();
        repoMappingsInput.split(/\r?\n/).forEach(function(key) {
            // Get the hostname, org name, and repo name
            // format expected:  sub.host.com/OWNER/REPO
            let parts = key.trim().match(/(.*)\/(.*)\/(.*)/);
            if (parts.length != 4) {
                throw `Invalid ${repoMappingsName} format at: ${key}`;
            }

            // Add this to the array of mappings
            let mapping = {
                host: parts[1],
                owner: parts[2],
                repo: parts[3],
                pseudoHost: `${parts[3]}.${parts[1]}`
            };
            repoMappings.push(mapping);

            // Create rewrites
            console.log(`Adding insteadOf entries in git config for ${key}`);
            child_process.execSync(`git config --global url."git@http.${mapping.pseudoHost}:${mapping.owner}/${mapping.repo}".insteadOf "https://${mapping.host}/${mapping.owner}/${mapping.repo}"`);
            child_process.execSync(`git config --global url."git@ssh.${mapping.pseudoHost}:${mapping.owner}/${mapping.repo}".insteadOf "git@${mapping.host}:${mapping.owner}/${mapping.repo}"`);
        });
    }

    // Add private keys to ssh-agent
    console.log("Adding private key to agent");
    const privateKeys = privateKey.split(/(?=-----BEGIN)/);
    if (repoMappings && privateKeys.length != repoMappings.length) {
        core.setFailed(`The number of ${privateKeyName} arguments and ${repoMappingsName} must match.`);

        return;
    }

    privateKeys.forEach(function(key, i) {
        if (repoMappings) {
            let mapping = repoMappings[i];
            let keyFile = `${mapping.pseudoHost}.key`;

            // Since we can't specify hostname/user/host options in a ssh-add call...
            // Write the key to a file
            fs.writeFileSync(`${homeSsh}/${keyFile}`, key.replace("\r\n", "\n").trim() + "\n", { mode: '600' });

            // Update ssh config
            let hostEntry = `\nHost http.${mapping.pseudoHost}\n`
                          + `    HostName ${mapping.host}\n`
                          + `    User git\n`
                          + `    IdentityFile ~/.ssh/${keyFile}\n`
                          + `    IdentitiesOnly yes\n`
                          + `\nHost ssh.${mapping.pseudoHost}\n`
                          + `    HostName ${mapping.host}\n`
                          + `    User git\n`
                          + `    IdentityFile ~/.ssh/${keyFile}\n`
                          + `    IdentitiesOnly yes\n`;

            fs.appendFileSync(sshConfig, hostEntry);
        } else {
            // No mappings, just use ssh-add
            child_process.execSync('ssh-add -', { input: key.trim() + "\n" });
        }
    });

    console.log("Keys added:");
    if (repoMappings) {
        repoMappings.forEach(function(key) {
            console.log(`~/.ssh/${key.pseudoHost}.key`);
        });
    } else {
        child_process.execSync('ssh-add -l', { stdio: 'inherit' });
    }

} catch (error) {
    core.setFailed(error.message);
}
