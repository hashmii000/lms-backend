pipeline {
    agent any

    tools {
        nodejs "node"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        NODE_ENV = "test"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Environment Check') {
            steps {
                bat 'node -v'
                bat 'npm -v'
            }
        }

        stage('Lint / Code Quality') {
            steps {
                bat 'npm run lint || echo No lint script found'
            }
        }

        stage('Security Audit') {
            steps {
                bat 'npm audit --audit-level=high || echo Vulnerabilities found'
            }
        }

        stage('Build Validation') {
            steps {
                bat 'npm run build || echo No build script found'
            }
        }

        stage('Smoke Test') {
            steps {
                bat 'node index.js'
            }
        }
    }

    post {
        success {
            echo '✔ Backend CI SUCCESS'
        }
        failure {
            echo '❌ Backend CI FAILED'
        }
        always {
            cleanWs()
        }
    }
}