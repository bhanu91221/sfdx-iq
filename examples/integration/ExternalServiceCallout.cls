/**
 * ExternalServiceCallout - REST callout using Named Credentials.
 *
 * Handles GET and POST requests with retry logic (up to 3 attempts),
 * structured error handling, and JSON deserialization.
 * Uses Named Credential for endpoint and authentication.
 */
public with sharing class ExternalServiceCallout {

    private static final String NAMED_CREDENTIAL = 'callout:External_Service';
    private static final Integer MAX_RETRIES = 3;
    private static final Integer TIMEOUT_MS = 30000;

    /**
     * Perform a GET request to the external service.
     *
     * @param endpoint Relative path appended to the Named Credential URL
     * @return CalloutResponse wrapper with status, body, and success flag
     */
    public static CalloutResponse doGet(String endpoint) {
        return executeWithRetry('GET', endpoint, null);
    }

    /**
     * Perform a POST request to the external service.
     *
     * @param endpoint Relative path appended to the Named Credential URL
     * @param body JSON string to send as the request body
     * @return CalloutResponse wrapper with status, body, and success flag
     */
    public static CalloutResponse doPost(String endpoint, String body) {
        return executeWithRetry('POST', endpoint, body);
    }

    /**
     * Execute an HTTP request with retry logic.
     * Retries on 500+ status codes up to MAX_RETRIES times.
     */
    private static CalloutResponse executeWithRetry(String method, String endpoint, String body) {
        CalloutResponse result;

        for (Integer attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            result = execute(method, endpoint, body);
            if (result.isSuccess || result.statusCode < 500) {
                break;
            }
            // Log retry attempt for monitoring
            System.debug(LoggingLevel.WARN,
                'Retry ' + attempt + '/' + MAX_RETRIES +
                ' for ' + method + ' ' + endpoint +
                ' (status: ' + result.statusCode + ')'
            );
        }

        return result;
    }

    private static CalloutResponse execute(String method, String endpoint, String body) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(NAMED_CREDENTIAL + endpoint);
        req.setMethod(method);
        req.setTimeout(TIMEOUT_MS);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');

        if (body != null && method == 'POST') {
            req.setBody(body);
        }

        try {
            Http http = new Http();
            HttpResponse res = http.send(req);
            return new CalloutResponse(res.getStatusCode(), res.getBody());
        } catch (CalloutException e) {
            return new CalloutResponse(0, e.getMessage());
        }
    }

    /**
     * Wrapper class for callout responses.
     */
    public class CalloutResponse {
        @AuraEnabled public Integer statusCode;
        @AuraEnabled public String body;
        @AuraEnabled public Boolean isSuccess;

        public CalloutResponse(Integer statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
            this.isSuccess = statusCode >= 200 && statusCode < 300;
        }

        /**
         * Deserialize the response body into a typed object.
         */
        public Object deserialize(Type targetType) {
            if (!this.isSuccess || String.isBlank(this.body)) {
                return null;
            }
            return JSON.deserialize(this.body, targetType);
        }
    }
}
