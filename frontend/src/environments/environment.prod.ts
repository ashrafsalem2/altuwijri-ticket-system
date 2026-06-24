// Production: the Angular site (IIS, e.g. http://localhost:8080) calls the API site.
// Adjust to match the deployed API origin if different.
export const environment = {
  production: true,
  apiBaseUrl: 'http://192.168.100.68:8081'
};
