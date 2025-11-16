import jenkins.model.Jenkins
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.security.SecurityRealm
import hudson.util.Secret

// Configure basic security
def instance = Jenkins.getInstance()
def hudsonRealm = new hudson.security.HudsonPrivateSecurityRealm(false)
instance.setSecurityRealm(hudsonRealm)

def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
instance.setAuthorizationStrategy(strategy)

// Install recommended plugins
def pm = instance.getPluginManager()
def uc = instance.getUpdateCenter()

// List of plugins to install
def pluginsToInstall = [
    'git',
    'docker',
    'docker-commons',
    'docker-pipeline',
    'nodejs',
    'blueocean',
    'blueocean-docker-to-container',
    'pipeline-stage-view',
    'pipeline-build-step',
    'pipeline-graph-analysis',
    'credentials',
    'credentials-binding',
    'email-ext',
    'simple-email-plugin'
]

pluginsToInstall.each { pluginName ->
    def plugin = uc.getPlugin(pluginName)
    if (plugin != null) {
        instance.pluginManager.plugins.add(plugin)
    }
}

instance.save()
