const core = require('@actions/core')
const { execSync } = require('child_process')

try {
    // Kill the started SSH agent
    console.log('Stopping SSH agent')
    execSync('kill ${SSH_AGENT_PID}', { stdio: 'inherit' })
} catch (error) {
    console.log(error.message);
    console.log('Error stopping the SSH agent, proceeding anyway');
}
