"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSpinner = startSpinner;
exports.stopSpinner = stopSpinner;
let spinnerChars = ["|", "/", "-", "\\"];
let spinnerIndex = 0;
let spinnerInterval;
function startSpinner(pageNumber, content) {
    spinnerInterval = setInterval(() => {
        process.stdout.write(`\rGenerating the Page ${pageNumber} ${content}... ${spinnerChars[spinnerIndex++]}`);
        spinnerIndex %= spinnerChars.length;
    }, 100);
}
function stopSpinner() {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
    }
}
