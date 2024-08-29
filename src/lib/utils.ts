export function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    // If not, set up a MutationObserver to watch for it
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
            return;
          }
        }
      }
    });

    // Start observing the document body for DOM changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

export function cutToTwoDecimals(num: number): string {
  const truncated = Math.floor(num * 100) / 100;
  return truncated.toFixed(2);
}
