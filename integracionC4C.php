<?php

class IntegrationActivityTaskC4C
{

    /**
     * The BasePath is the URL for the system
     * including the form result service.
     *
     * @var string
     */
    const BASE_PATH = "https://e400060-iflmap.hcisbt.br1.hana.ondemand.com/http/crearactividadc4c";
    const RESULT_HEADERS_PATH = "ResultHeaders";
    const CREDENTIALS = 'S0024632841:Salinas.2130';

    function getParam($name)
    {
        $url = $_POST['url'];
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

        

        $Hoy = new DateTime();
        $hoy = $Hoy->format('Y-m-d\TH:i:s.') . substr($Hoy->format('u'), 0, 3) .'Z';
        $hoyMas2dias = $Hoy->add(new DateInterval('P2D'))->format('Y-m-d\TH:i:s.') . substr($Hoy->format('u'), 0, 3) .'Z';
        $nota = $this->checkedInut();

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
                        "Valor": "Z44"
                    },,
                    {
                        "Campo": "RUT",
                        "Valor": "'.$_POST['Rut'].'"
                    },,
                    {
                        "Campo": "Consentimiento",
                        "Valor": "true"
                    },
                    {
                        "Campo": "ProcesadorMotor",
                        "Valor": "false"
                    },
                    {
                        "Campo": "Conversica",
                        "Valor": "true"
                    },
                    {
                        "Campo": "TipoVehiculo",
                        "Valor": "'.$_POST['Comuna'].'"
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

        $location = "https://l5603-iflmap.hcisbp.us2.hana.ondemand.com/http/registraLeads";
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

        return $response;
    }
}

try {
    $integrcionC4C = new IntegrationActivityTaskC4C();
    return $integrcionC4C->execServices();
} catch (Exception $th) {
    echo $th->getMessage();
}
