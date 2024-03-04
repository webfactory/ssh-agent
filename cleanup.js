const core = require('@actions/core');
const { execFileSync } = require('child_process');
const { sshAgentCmdDefault } = require('./paths.js');

try {
    const sshAgentCmdInput = core.getInput('ssh-agent-cmd');
    const sshAgentCmd = sshAgentCmdInput ? sshAgentCmdInput : sshAgentCmdDefault;
    // Kill the started SSH agent
    console.log('Stopping SSH agent');
    execFileSync(sshAgentCmd, ['-k'], { stdio: 'inherit' });
} catch (error) {
    console.log(error.message);
    console.log('Error stopping the SSH agent, proceeding anyway');
}
