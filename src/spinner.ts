let spinnerChars: string[] = ["|", "/", "-", "\\"];
let spinnerIndex: number = 0;
let spinnerInterval: NodeJS.Timeout | undefined;

export function startSpinner(pageNumber: number, content:string): void {
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\rGenerating the Page ${pageNumber} ${content}... ${spinnerChars[spinnerIndex++]}`);
    spinnerIndex %= spinnerChars.length;
  }, 100);
}

export function stopSpinner(): void {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
  }
}
