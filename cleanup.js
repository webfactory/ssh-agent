const core = require('@actions/core')
const { execSync } = require('child_process')

try {
    // Kill the started SSH agent
    console.log('Stopping SSH agent')
    execSync('kill ${SSH_AGENT_PID}', { stdio: 'inherit' })
} catch (error) {
    core.setFailed(error.message)
}
