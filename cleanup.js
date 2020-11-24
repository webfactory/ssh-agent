const core = require('@actions/core')
const { execSync } = require('child_process')

try {
    // Kill the started SSH agent
    console.log('Stopping SSH agent')
    execSync('kill ${SSH_AGENT_PID}', { stdio: 'inherit' })

    const home = process.env['HOME'];
    const homeSsh = `${home}/.ssh`;
    const gitSSHWrapperPath = path.join(homeSsh, 'git-deploy-key-wrapper.sh');
    if (fs.existsSync(gitSSHWrapperPath)) {
        console.log('Removing ssh git SSH wrapper');
        fs.unlinkSync(gitSSHWrapperPath);
    }
} catch (error) {
    console.log(error.message);
    console.log('Error stopping the SSH agent, proceeding anyway');
}
