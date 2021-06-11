const core = require('@actions/core');
const { execFileSync } = require('child_process');
const { sshAgent } = require('./paths.js');

try {
    // Kill the started SSH agent
    console.log('Stopping SSH agent');
    execFileSync(sshAgent, ['-k'], { stdio: 'inherit' });
} catch (error) {
    console.log(error.message);
    console.log('Error stopping the SSH agent, proceeding anyway');
}
