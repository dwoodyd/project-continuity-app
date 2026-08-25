# Studio Wall Validation Notes

On August 17, 2026, the browser preview request for `/start?code=BOOK-START` received “Too many requests. Please try again later.” from the development proxy. This happened before application rendering, so it does not establish a Book Start route defect. Complete validation will use TypeScript and automated tests, with a browser retry after the proxy limit clears.
