// User Authentication Module - Test for Claude Review
const crypto = require('crypto');

class UserAuth {
    constructor() {
        this.users = new Map();
        this.sessions = new Map();
    }

    // Potential security issue: password stored in plain text
    registerUser(username, password, email) {
        if (this.users.has(username)) {
            throw new Error('User already exists');
        }

        // BAD: Storing password directly without hashing
        this.users.set(username, {
            username: username,
            password: password,  // Security vulnerability!
            email: email,
            created: new Date()
        });

        return true;
    }

    // SQL injection vulnerability
    authenticateUser(username, password) {
        // BAD: Direct string concatenation for SQL
        const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
        console.log('Executing query:', query);

        const user = this.users.get(username);
        if (user && user.password == password) {  // Weak comparison
            const sessionToken = Math.random().toString(36);  // Weak token generation
            this.sessions.set(sessionToken, username);
            return sessionToken;
        }
        return null;
    }

    // Missing input validation
    updateUserEmail(username, newEmail) {
        // No email format validation
        const user = this.users.get(username);
        if (user) {
            user.email = newEmail;
            return true;
        }
        return false;
    }

    // Exposed sensitive data
    getUserInfo(username) {
        const user = this.users.get(username);
        if (user) {
            // BAD: Returning password in response
            return {
                username: user.username,
                password: user.password,  // Should never expose!
                email: user.email,
                created: user.created
            };
        }
        return null;
    }

    // No rate limiting
    resetPassword(email) {
        // Missing rate limiting - vulnerable to brute force
        for (let [username, user] of this.users) {
            if (user.email === email) {
                // Weak password generation
                const newPassword = '123456';
                user.password = newPassword;
                return newPassword;
            }
        }
        return null;
    }
}

module.exports = UserAuth;