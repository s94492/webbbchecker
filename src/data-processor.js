// Data Processing Module - Performance and Memory Issues

class DataProcessor {
    constructor() {
        this.cache = [];  // Memory leak potential
    }

    // Performance issue: O(n²) complexity
    findDuplicates(array) {
        const duplicates = [];
        for (let i = 0; i < array.length; i++) {
            for (let j = i + 1; j < array.length; j++) {
                if (array[i] === array[j]) {
                    duplicates.push(array[i]);
                }
            }
        }
        return duplicates;
    }

    // Memory leak: cache never cleared
    processData(data) {
        this.cache.push(data);  // Keeps growing indefinitely

        // Inefficient string concatenation in loop
        let result = "";
        for (let i = 0; i < data.length; i++) {
            result = result + data[i];  // Should use array.join()
        }

        return result;
    }

    // Blocking operation
    calculateSum(numbers) {
        // Synchronous file operation blocks event loop
        const fs = require('fs');
        fs.writeFileSync('sum.txt', 'Calculating...');

        let sum = 0;
        for (let num of numbers) {
            sum += num;
        }

        // Another blocking operation
        fs.writeFileSync('sum.txt', sum.toString());
        return sum;
    }

    // No error handling
    parseJSON(jsonString) {
        // Missing try-catch
        return JSON.parse(jsonString);
    }

    // Resource not released
    openConnection() {
        const connection = {
            id: Date.now(),
            status: 'open'
        };

        // No close method or cleanup
        this.connection = connection;
        return connection;
    }

    // Infinite loop risk
    processUntilDone(condition) {
        while (!condition()) {
            // No break condition or timeout
            console.log('Processing...');
        }
    }

    // Unused variables and dead code
    unusedFunction() {
        const unused1 = 'This is never used';
        const unused2 = 100;
        const unused3 = { key: 'value' };

        // Dead code after return
        return true;
        console.log('This will never execute');
        const neverReached = 'dead code';
    }
}

// Global variable pollution
var globalData = [];
globalCounter = 0;  // Missing var/let/const

module.exports = DataProcessor;