pipeline {
    agent any

    tools {
        nodejs "node18"
    }

    environment {
        IMAGE_TAG = "${BUILD_NUMBER}"
        BACKEND_IMAGE = "crisis-connect-backend:${IMAGE_TAG}"
        FRONTEND_IMAGE = "crisis-connect-frontend:${IMAGE_TAG}"
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
                    sh 'echo "Backend lint goes here (configure eslint)"'
                }
            }
        }

        stage('Lint Frontend') {
            steps {
                echo '🔍 Linting frontend code...'
                dir('frontend') {
                    sh 'echo "Frontend lint goes here (configure eslint)"'
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
                echo '🧪 Running backend tests...'
                dir('backend') {
                    sh 'echo "Backend tests here (add test command)"'
                }
            }
        }

        stage('Test Frontend') {
            steps {
                echo '🧪 Running frontend tests...'
                dir('frontend') {
                    sh 'echo "Frontend tests here (add npm test)"'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker images...'
                sh """
                    docker build -t ${BACKEND_IMAGE} ./backend
                    docker build -t ${FRONTEND_IMAGE} ./frontend
                """
            }
        }

        stage('Push Docker Images') {
            when {
                branch 'main'
            }
            steps {
                echo '📤 Pushing Docker images to registry...'
                withCredentials([usernamePassword(credentialsId: 'docker-registry-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        docker tag ${BACKEND_IMAGE} ${DOCKER_USER}/crisis-connect-backend:${IMAGE_TAG}
                        docker tag ${FRONTEND_IMAGE} ${DOCKER_USER}/crisis-connect-frontend:${IMAGE_TAG}

                        echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin

                        docker push ${DOCKER_USER}/crisis-connect-backend:${IMAGE_TAG}
                        docker push ${DOCKER_USER}/crisis-connect-frontend:${IMAGE_TAG}

                        docker logout
                    """
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying to production...'
                sh """
                    echo "Configure your deployment commands here"
                """
            }
        }

        stage('Docker Cleanup') {
            steps {
                echo '🧹 Cleaning Docker cache...'
                sh 'docker system prune -f || true'
            }
        }

        stage('Workspace Cleanup') {
            steps {
                echo '🧹 Cleaning workspace safely...'
                cleanWs()
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
    }
}
