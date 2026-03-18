/**
 * ExternalServiceMock - Reusable HttpCalloutMock with configurable responses.
 *
 * Use this mock in test classes to simulate different HTTP responses
 * without creating multiple inner mock classes.
 */
@IsTest
public class ExternalServiceMock implements HttpCalloutMock {

    private Integer statusCode;
    private String responseBody;
    private Map<String, String> headers;

    public ExternalServiceMock(Integer statusCode, String responseBody) {
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.headers = new Map<String, String>{
            'Content-Type' => 'application/json'
        };
    }

    public ExternalServiceMock(Integer statusCode, String responseBody, Map<String, String> headers) {
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.headers = headers;
    }

    public HttpResponse respond(HttpRequest req) {
        HttpResponse res = new HttpResponse();
        res.setStatusCode(this.statusCode);
        res.setBody(this.responseBody);
        for (String key : this.headers.keySet()) {
            res.setHeader(key, this.headers.get(key));
        }
        return res;
    }
}
