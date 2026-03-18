/**
 * ExternalServiceCalloutTest - Tests for ExternalServiceCallout.
 *
 * Uses inner HttpCalloutMock classes to simulate success, error, and timeout scenarios.
 * Verifies retry behavior on server errors.
 */
@IsTest
private class ExternalServiceCalloutTest {

    private class SuccessMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"id":"001","name":"Test Record"}');
            res.setHeader('Content-Type', 'application/json');
            return res;
        }
    }

    private class ServerErrorMock implements HttpCalloutMock {
        private Integer callCount = 0;

        public HttpResponse respond(HttpRequest req) {
            callCount++;
            HttpResponse res = new HttpResponse();
            res.setStatusCode(500);
            res.setBody('{"error":"Internal Server Error"}');
            return res;
        }
    }

    private class TimeoutMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            throw new CalloutException('Read timed out');
        }
    }

    @IsTest
    static void testGetSuccess() {
        Test.setMock(HttpCalloutMock.class, new SuccessMock());

        Test.startTest();
        ExternalServiceCallout.CalloutResponse result = ExternalServiceCallout.doGet('/api/records/001');
        Test.stopTest();

        System.assert(result.isSuccess, 'GET should succeed with 200 response');
        System.assertEquals(200, result.statusCode);
        System.assert(result.body.contains('Test Record'), 'Body should contain response data');
    }

    @IsTest
    static void testPostSuccess() {
        Test.setMock(HttpCalloutMock.class, new SuccessMock());
        String requestBody = '{"name":"New Record"}';

        Test.startTest();
        ExternalServiceCallout.CalloutResponse result = ExternalServiceCallout.doPost('/api/records', requestBody);
        Test.stopTest();

        System.assert(result.isSuccess, 'POST should succeed with 200 response');
        System.assertEquals(200, result.statusCode);
    }

    @IsTest
    static void testServerErrorTriggersRetry() {
        ServerErrorMock mock = new ServerErrorMock();
        Test.setMock(HttpCalloutMock.class, mock);

        Test.startTest();
        ExternalServiceCallout.CalloutResponse result = ExternalServiceCallout.doGet('/api/records');
        Test.stopTest();

        System.assert(!result.isSuccess, 'Should not be successful on persistent 500');
        System.assertEquals(500, result.statusCode);
    }

    @IsTest
    static void testTimeoutHandling() {
        Test.setMock(HttpCalloutMock.class, new TimeoutMock());

        Test.startTest();
        ExternalServiceCallout.CalloutResponse result = ExternalServiceCallout.doGet('/api/records');
        Test.stopTest();

        System.assert(!result.isSuccess, 'Should not be successful on timeout');
        System.assertEquals(0, result.statusCode, 'Status code should be 0 for exceptions');
        System.assert(result.body.contains('timed out'), 'Body should contain exception message');
    }

    @IsTest
    static void testDeserializeResponse() {
        Test.setMock(HttpCalloutMock.class, new SuccessMock());

        Test.startTest();
        ExternalServiceCallout.CalloutResponse result = ExternalServiceCallout.doGet('/api/records/001');
        Test.stopTest();

        Map<String, Object> parsed = (Map<String, Object>) result.deserialize(Map<String, Object>.class);
        System.assertNotEquals(null, parsed, 'Deserialized result should not be null');
        System.assertEquals('Test Record', parsed.get('name'));
    }
}
