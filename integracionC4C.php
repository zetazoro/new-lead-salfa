<?php

class IntegrationActivityTaskC4C
{

    /**
     * The BasePath is the URL for the system
     * including the form result service.
     *
     * @var string
     */
    //const BASE_PATH = "https://l5603-iflmap.hcisbp.us2.hana.ondemand.com/http/registraLeads";
    //const RESULT_HEADERS_PATH = "ResultHeaders";
    //const CREDENTIALS = 'S0024632841:Salinas.2130';

    const BASE_PATH = "https://e400060-iflmap.hcisbt.br1.hana.ondemand.com/http/crearactividadc4c";
    const RESULT_HEADERS_PATH = "ResultHeaders";
    const CREDENTIALS = 'S0022888059:$alfA.2020';

    function getParam($name)
    {
        $url = $_POST['Url'];
        $parts = parse_url($url);
        parse_str($parts['query'], $query);
        return $query[$name];
    }

    function removeZeros($str)
    {
        $str = ltrim($str, "0");
        return $str;
    }

    function checkedInut()
    {

        return '';
    }

    function getBody()
    {


        $body = ''.
            '{
                "Cabecera": {
                    "Nombre": "'.$_POST['Nombre'].'",
                    "Apellido": "'.$_POST['Apellido'].'",
                    "NombreEmpresa": "'.$_POST['NombreEmpresa'].'",
                    "Email": "'.$_POST['Email'].'",
                    "Telefono": "'.$_POST['Telefono'].'",
                    "LN": "100"
                },
                "Posiciones": [
                    {
                        "Campo": "WebSite",
                        "Valor": "003"
                    },
                    {
                        "Campo": "RUT",
                        "Valor": "'.$_POST['Rut'].'"
                    },
                    {
                        "Campo": "Consentimiento",
                        "Valor": true
                    },
                    {
                        "Campo": "ProcesadorMotor",
                        "Valor": false
                    },
                    {
                        "Campo": "Conversica",
                        "Valor": true
                    },
                    {
                        "Campo": "CiudadComuna",
                        "Valor": "'.$_POST['Comuna'].'"
                    },
                    {
                        "Campo": "Utm_Idcampana",
                        "Valor": "'.$this->getParam('utm_campaign').'"
                    },
                    {
                        "Campo": "Utm_Idcampaign",
                        "Valor": "'.$this->getParam('utm_campaign').'"
                    },
                    {
                        "Campo": "UtmMedium",
                        "Valor": "'.$this->getParam('utm_medium').'"
                    },
                    {
                        "Campo": "UtmSource",
                        "Valor": "'.$this->getParam('utm_source').'"
                    },
                    {
                        "Campo": "UtmContent",
                        "Valor": "ES"
                    },
                    {
                        "Campo": "UtmTerm",
                        "Valor": "'.urlencode(.$this->getParam('utm_term')).'"
                    }
                ]
            }';

        return $body;
    }

    function getHeader()
    {
        
        $headerTask = [
            'Method: POST',
            'Content-Type: application/json',
            "Authorization: Basic " . base64_encode($this::CREDENTIALS),
            'User-Agent: PHP-SOAP-CURL',
            'Accept: */*',
            'Connection: keep-alive',
            'Accept-Encoding: gzip, deflate, br'
        ];
        return $headerTask;
    }

    function execServices()
    {

        $location = $this::BASE_PATH;
        $request = $this->getBody();
        $headers = $this->getHeader();


        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $location);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $request);
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

        $response = curl_exec($ch);
        $err_status = curl_error($ch);
        echo "<script>console.log('Console: " . $$response . "' );</script>";
        
        echo $response;
        return $response;
    }
}

try {
    $integrcionC4C = new IntegrationActivityTaskC4C();

    return $integrcionC4C->execServices();
} catch (Exception $th) {
    echo $th->getMessage();
}
