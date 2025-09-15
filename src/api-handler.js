// API Handler - Various Best Practice Violations

const axios = require('axios');

class APIHandler {
    constructor() {
        // Hardcoded credentials (security issue)
        this.apiKey = 'sk-1234567890abcdef';
        this.secretToken = 'super-secret-token-123';
        this.baseURL = 'https://api.example.com';
    }

    // No input sanitization
    async fetchUserData(userId) {
        // Direct interpolation without validation
        const url = `${this.baseURL}/users/${userId}`;

        try {
            // API key exposed in URL
            const response = await axios.get(`${url}?api_key=${this.apiKey}`);
            return response.data;
        } catch (error) {
            // Generic error, no specific handling
            console.log(error);
            return null;
        }
    }

    // Race condition potential
    async updateCounter() {
        // Non-atomic operation
        const current = await this.getCounter();
        const updated = current + 1;
        await this.setCounter(updated);  // Race condition if called concurrently
        return updated;
    }

    // Missing async/await
    getData(endpoint) {
        // Returns promise instead of data
        return axios.get(`${this.baseURL}/${endpoint}`)
            .then(res => res.data);
    }

    // Callback hell
    processMultipleAPIs(callback) {
        this.fetchUserData(1).then(user => {
            this.fetchUserData(2).then(user2 => {
                this.fetchUserData(3).then(user3 => {
                    this.fetchUserData(4).then(user4 => {
                        callback([user, user2, user3, user4]);
                    });
                });
            });
        });
    }

    // No timeout handling
    async longRunningRequest(url) {
        // Could hang indefinitely
        const response = await axios.get(url);
        return response.data;
    }

    // Circular reference issue
    createCircularObject() {
        const obj = { name: 'test' };
        obj.self = obj;  // Circular reference
        return JSON.stringify(obj);  // Will throw error
    }

    // Missing null checks
    processResponse(response) {
        // Potential null pointer
        return response.data.items.map(item => item.name.toUpperCase());
    }

    // Improper promise handling
    async mixedPromises() {
        const promise1 = this.fetchUserData(1);
        const promise2 = this.fetchUserData(2);

        // Not waiting for promises
        return promise1 + promise2;  // Returns "[object Promise][object Promise]"
    }
}

// Exporting instance instead of class (singleton anti-pattern)
module.exports = new APIHandler();