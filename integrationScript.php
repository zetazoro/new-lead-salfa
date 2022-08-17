<?php

/**
 * This class is an example implementation
 * of a PHP based form integration.
 * Note: This is a template, which is used at your own risk.
 */
class LandingPageIntegration
{

    /**
     * The BasePath is the URL for the system
     * including the form result service.
     *
     * @var string
     */
    const BASE_PATH = "https://my301988-api.s4hana.ondemand.com/sap/opu/odata/sap/CUAN_CONTENT_PAGE_RESULT_SRV/";

    /**
     * The ResultHeadersPath is the name of the ResultHeaders entity
     * which is used for processing the form results.
     *
     * @var string
     */
    const RESULT_HEADERS_PATH = "ResultHeaders";

    /**
     * The credentials are used for authenticating on the system.
     * This is usually a dedicated system or communication user
     * with the integration role assigned.
     *
     * @var string
     */
    const CREDENTIALS = "MKT_LP_FORM_RESULT_USER:ZtilqxVHxeH>ZDWjlrouiMzwQDwvecTpulMnNgg7";

    /**
     * The cookies are remembered between consecutive OData requests
     * to implement the session handling
     * and security measures of the SAP Gateway.
     *
     * @var string
     */
    private $cookies = "";

    /**
     * The CSRF-Token is required for the OData service communication
     * and must be fetched before it is possible
     * to perform any changing requests such as 'POST'.
     *
     * @var string
     */
    private $csrfToken = null;

    /**
     * This method is the main entry point
     * for processing the requests received from forms.
     */
    public function execute()
    {
        switch ($_SERVER["REQUEST_METHOD"]) {
            case "POST":
                $this->handlePostRequest();
                break;
        }
    }

    /**
     * POST requests must be forwarded to the system
     * and the responses must be passed to the client
     * to ensure correct form integration.
     */
    private function handlePostRequest()
    {
        // first fetch the csrf-token
        $this->fetchCsrfToken();
        
        // read the POST data sent by the form
        $requestBody = @file_get_contents("php://input");
        $requestData = json_decode($requestBody);
        
        // optional: enhance the request data with the IP address for tracking purposes
        $requestData->IpAddress = $_SERVER["REMOTE_ADDR"];
        
        // optional: add the campaign id to connect all form interactions to your campaign
        // $requestData->CampaignId = "your-campaign-id";
        
        // send the prepared request data to the system
        $requestString = json_encode($requestData);
        $response = $this->sendHttpRequest("POST", $this::BASE_PATH . $this::RESULT_HEADERS_PATH, $requestString);
        
        // print the response
        echo $response;
    }

    /**
     * Send a 'HEAD' request to fetch
     * the required CSRF-Token from the OData service.
     * If the HEAD request fails, a 'GET' request is performed.
     */
    private function fetchCsrfToken()
    {
        $this->sendHttpRequest("HEAD", $this::BASE_PATH, null);
        if (! $this->csrfToken) {
            // HEAD request failed -> fallback using GET
            $this->sendHttpRequest("GET", $this::BASE_PATH, null);
        }
    }

    /**
     * This method performs a synchronous HTTP request
     * and returns its response.
     *
     * @param string $method
     *            The HTTP method (e.g. 'HEAD', 'POST')
     * @param string $path
     *            The URL for the request
     * @param string $body
     *            The request payload (POST data)
     * @return string The response
     */
    private function sendHttpRequest($method, $path, $body)
    {
        // first create stream context
        $context = $this->createStreamContext($method, $body);
        
        // perform http request
        $response = file_get_contents($path, false, $context);
        
        if ($response === false) {
            // request failed - print error for analysis
            $error = error_get_last();
            if (is_array($error)) {
                echo $error["message"];
            } else {
                echo $error;
            }
        }
        
        // process response headers
        $this->readResponseHeaders($http_response_header);
        
        // return response
        return $response;
    }

    /**
     * This method creates a stream context, which is used for the HTTP request.
     * It configures the context for
     * the authorization, content-type, cookies, and csrf-token.
     *
     * @param string $method
     *            The HTTP method
     * @param string $body
     *            The request payload (POST data)
     * @return resource The stream context
     */
    private function createStreamContext($method, $body)
    {
        // basic authorization uses base64 encoded credentials
        $credentials = base64_encode($this::CREDENTIALS);
        
        // build http request headers
        $headers = array(
            "Authorization: Basic " . $credentials,
            "Accept: application/json",
            "Content-Type: application/json"
        );
        
        if ($this->cookies) {
            // add remembered cookies
            array_push($headers, "Cookie: " . $this->cookies);
        }
        
        // add x-csrf-token header for fetching or using the already fetched token
        $csrfToken = ($this->csrfToken ?: "Fetch");
        array_push($headers, "x-csrf-token: " . $csrfToken);
        
        // build complete options array
        $options = array(
            "http" => array(
                "header" => $headers,
                "method" => $method,
                "content" => $body,
                "ignore_errors" => true,
                "max_redirects" => 0
            )
        );
        
        // return stream context using the built options
        return stream_context_create($options);
    }

    /**
     * This method processes the HTTP response headers
     * in order to read the fetched CSRF-Token and cookies.
     *
     * @param array $responseHeaders            
     */
    private function readResponseHeaders($responseHeaders)
    {
        // loop response headers
        foreach ($responseHeaders as $responseHeader) {
            // split header name from value
            $parts = explode(" ", $responseHeader);
            
            // handle response header based on name
            switch (strtolower($parts[0])) {
                case "HTTP/1.0":
                    // status code
                    http_response_code($parts[1]);
                    break;
                case "x-csrf-token:":
                    // save fetched csrf-token
                    $this->csrfToken = $parts[1];
                    break;
                case "set-cookie:":
                    // set received cookies
                    $this->cookies .= $parts[1];
                    break;
            }
        }
    }
}

// initialize the integration class and start the processing
$landingPageIntegration = new LandingPageIntegration();
$landingPageIntegration->execute();