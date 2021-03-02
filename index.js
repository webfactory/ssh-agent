const core = require('@actions/core');
const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const token = require('crypto').randomBytes(64).toString('hex');
const isWindows = (process.env['OS'] == 'Windows_NT');

try {
    const privateKey = core.getInput('ssh-private-key');

    if (!privateKey) {
        core.setFailed("The ssh-private-key argument is empty. Maybe the secret has not been configured, or you are using a wrong secret name in your workflow file.");

        return;
    }

    var home;

    if (isWindows) {
        console.log('Preparing ssh-agent service on Windows');
        child_process.execSync('sc config ssh-agent start=demand', { stdio: 'inherit' });

        // Work around https://github.com/PowerShell/openssh-portable/pull/447 by creating a \dev\tty file
        fs.mkdirSync('\\dev');
        fs.closeSync(fs.openSync('\\dev\\tty', 'a'));

        home = os.homedir();
    } else {
        // Use getent() system call, since this is what ssh does; makes a difference in Docker-based
        // Action runs, where $HOME is different from the pwent
        var { homedir: home } = os.userInfo();
    }

    const homeSsh = home + '/.ssh';

    console.log(`Adding GitHub.com keys to ${homeSsh}/known_hosts`);
    fs.mkdirSync(homeSsh, { recursive: true });
    fs.appendFileSync(`${homeSsh}/known_hosts`, '\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n');
    fs.appendFileSync(`${homeSsh}/known_hosts`, '\ngithub.com ssh-dss AAAAB3NzaC1kc3MAAACBANGFW2P9xlGU3zWrymJgI/lKo//ZW2WfVtmbsUZJ5uyKArtlQOT2+WRhcg4979aFxgKdcsqAYW3/LS1T2km3jYW/vr4Uzn+dXWODVk5VlUiZ1HFOHf6s6ITcZvjvdbp6ZbpM+DuJT7Bw+h5Fx8Qt8I16oCZYmAPJRtu46o9C2zk1AAAAFQC4gdFGcSbp5Gr0Wd5Ay/jtcldMewAAAIATTgn4sY4Nem/FQE+XJlyUQptPWMem5fwOcWtSXiTKaaN0lkk2p2snz+EJvAGXGq9dTSWHyLJSM2W6ZdQDqWJ1k+cL8CARAqL+UMwF84CR0m3hj+wtVGD/J4G5kW2DBAf4/bqzP4469lT+dF2FRQ2L9JKXrCWcnhMtJUvua8dvnwAAAIB6C4nQfAA7x8oLta6tT+oCk2WQcydNsyugE8vLrHlogoWEicla6cWPk7oXSspbzUcfkjN3Qa6e74PhRkc7JdSdAlFzU3m7LMkXo1MHgkqNX8glxWNVqBSc0YRdbFdTkL0C6gtpklilhvuHQCdbgB3LBAikcRkDp+FCVkUgPC/7Rw==\n');

    console.log("Starting ssh-agent");
    const authSock = core.getInput('ssh-auth-sock');
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

    console.log("Adding private keys to agent");
    var keyNumber = 0;

    privateKey.split(/(?=-----BEGIN)/).forEach(function(key) {
        ++keyNumber;
        let keyFile = `${homeSsh}/key_${keyNumber}`;

        // Write private key (unencrypted!) to file
        console.log(`Write file ${keyFile}`);
        fs.writeFileSync(keyFile, key.replace("\r\n", "\n").trim() + "\n", { mode: '600' });

        // Set private key passphrase
        let output = '';
        try {
            console.log(`Set passphrase on ${keyFile}`);
            output = child_process.execFileSync('ssh-keygen', ['-p', '-f', keyFile, '-N', token]);
        } catch (exception) {
            fs.unlinkSync(keyFile);
            
            throw exception;
        }

        // Load key into agent
        if (isWindows) {
            child_process.execFileSync('ssh-add', [keyFile], { env: { ...process.env, ...{ 'DISPLAY': 'fake', 'SSH_PASS': token, 'SSH_ASKPASS': 'D:\\a\\ssh-agent\\ssh-agent\\askpass.exe' } } });
        } else {
            child_process.execFileSync('ssh-add', [keyFile], { env: process.env, input: token });
        }
        
        output.toString().split(/\r?\n/).forEach(function(key) {
            let parts = key.match(/^Key has comment '.*\bgithub\.com[:/]([_.a-z0-9-]+\/[_.a-z0-9-]+?)(?=\.git|\s|\')/);

            if (parts == null) {
                return;
            }

            let ownerAndRepo = parts[1];

            child_process.execSync(`git config --global --replace-all url."git@key-${keyNumber}:${ownerAndRepo}".insteadOf "https://github.com/${ownerAndRepo}"`);
            child_process.execSync(`git config --global --add url."git@key-${keyNumber}:${ownerAndRepo}".insteadOf "git@github.com:${ownerAndRepo}"`);
            child_process.execSync(`git config --global --add url."git@key-${keyNumber}:${ownerAndRepo}".insteadOf "ssh://git@github.com/${ownerAndRepo}"`);

            // Use IdentitiesOnly=no due to https://github.com/PowerShell/Win32-OpenSSH/issues/1550
            let sshConfig = `\nHost key-${keyNumber}\n`
                                  + `    HostName github.com\n`
                                  + `    User git\n`
                                  + `    IdentitiesOnly no\n`
                                  + `    IdentityFile ${keyFile}\n`;

            fs.appendFileSync(`${homeSsh}/config`, sshConfig);

            console.log(`Added deploy-key mapping: Use key #${keyNumber} for GitHub repository ${ownerAndRepo}`);
        });
    });

    console.log("Keys added:");
    child_process.execSync('ssh-add -l', { stdio: 'inherit' });

} catch (error) {
    core.setFailed(error.message);
}
