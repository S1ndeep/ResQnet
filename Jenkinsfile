pipeline {
    agent any

    environment {
        REGISTRY = credentials('docker-registry-url') // Set in Jenkins credentials
        IMAGE_TAG = "${BUILD_NUMBER}"
        BACKEND_IMAGE = "${REGISTRY}/crisis-connect-backend:${IMAGE_TAG}"
        FRONTEND_IMAGE = "${REGISTRY}/crisis-connect-frontend:${IMAGE_TAG}"
        DOCKER_REGISTRY_CREDS = credentials('docker-registry-creds') // Docker Hub or private registry
    }

    stages {
        stage('Checkout') {
            steps {
                echo '🔄 Checking out code from repository...'
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                echo '📦 Installing backend dependencies...'
                dir('backend') {
                    sh 'npm install --production'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                echo '📦 Installing frontend dependencies...'
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Lint Backend') {
            steps {
                echo '🔍 Linting backend code...'
                dir('backend') {
                    // Optional: add eslint or similar linter
                    sh 'echo "Backend lint check (configure linter in package.json)"'
                }
            }
        }

        stage('Lint Frontend') {
            steps {
                echo '🔍 Linting frontend code...'
                dir('frontend') {
                    // eslint is part of react-scripts
                    sh 'echo "Frontend lint check (configure eslint)"'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo '🏗️ Building frontend...'
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Test Backend') {
            steps {
                echo '✅ Running backend tests...'
                dir('backend') {
                    sh 'echo "Backend tests (configure test command in package.json)"'
                    // sh 'npm test' when you have tests set up
                }
            }
        }

        stage('Test Frontend') {
            steps {
                echo '✅ Running frontend tests...'
                dir('frontend') {
                    sh 'echo "Frontend tests (configure test command in package.json)"'
                    // sh 'npm test -- --watchAll=false' when you have tests set up
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker images...'
                script {
                    sh """
                        docker build -t ${BACKEND_IMAGE} ./backend
                        docker build -t ${FRONTEND_IMAGE} ./frontend
                    """
                }
            }
        }

        stage('Push Docker Images') {
            when {
                branch 'main' // Only push on main branch
            }
            steps {
                echo '📤 Pushing Docker images to registry...'
                script {
                    withCredentials([usernamePassword(credentialsId: 'docker-registry-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """
                            echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin
                            docker push ${BACKEND_IMAGE}
                            docker push ${FRONTEND_IMAGE}
                            docker logout
                        """
                    }
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying to production...'
                script {
                    // Example: update docker-compose or deploy to Kubernetes
                    sh """
                        echo "Deployment step - configure based on your infrastructure"
                        # docker compose -f docker-compose.prod.yml up -d
                    """
                }
            }
        }

        stage('Cleanup') {
            steps {
                echo '🧹 Cleaning up...'
                sh 'docker system prune -f'
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs above.'
        }
        always {
            cleanWs() // Clean workspace after build
        }
    }
}
