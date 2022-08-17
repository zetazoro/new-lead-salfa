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
    const CREDENTIALS = 'S0022888059:$alfA.2020';

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

        $idRef = $this->removeZeros($this->getParam('ID_REF'));
        $idCuenta = $this->removeZeros($this->getParam('ID_CLIENTE'));
        $idContacto = $this->removeZeros($this->getParam('ID_CONTACTO'));
        $idResponsable = $this->removeZeros($this->getParam('ID_RESPONSABLE'));
        $idCampanha = $this->getParam('utm_campaign');
        $idActividad = $this->getParam('sap-outbound-id');
		$utmSource = $this->getParam('utm_source');
		$utmMedio = $this->getParam('utm_medium');

        $Hoy = new DateTime();
        $hoy = $Hoy->format('Y-m-d\TH:i:s.') . substr($Hoy->format('u'), 0, 3) .'Z';
        $hoyMas2dias = $Hoy->add(new DateInterval('P2D'))->format('Y-m-d\TH:i:s.') . substr($Hoy->format('u'), 0, 3) .'Z';
        $nota = $this->checkedInut();

        $body = ''.
            '<n0:TaskActivityBundleMaintainRequest_sync_V1 xmlns:n0="http://sap.com/xi/SAPGlobal20/Global">'.
            '<BasicMessageHeader>'.
            '</BasicMessageHeader>'. 
            '<ActivityTask actionCode="01" >'.
            '<ProcessorParty> <BusinessPartnerInternalID>'.$idResponsable.'</BusinessPartnerInternalID> </ProcessorParty>'.
            '<ActivityParty contactPersonListCompleteTransmissionIndicator="true">'.
            '<RecipientPartyID>'.$idCuenta.'</RecipientPartyID>'.
            '<RoleCode>34</RoleCode>'.
            '<ContactPerson>'.
            '<RecipientPartyID>'.$idContacto.'</RecipientPartyID>'.
            '<RoleCode>ZP</RoleCode>'.
            '<MainIndicator>true</MainIndicator>'.
            '</ContactPerson>'.
            '<MainIndicator>true</MainIndicator>'.
            '</ActivityParty>'.
            '<BusinessTransactionDocumentReference><ID>'.$idRef.'</ID><TypeCode>72</TypeCode><RoleCode>1</RoleCode></BusinessTransactionDocumentReference>'.
            '<BusinessTransactionDocumentReference><ID>'.$idCampanha.'</ID><TypeCode>764</TypeCode><RoleCode>1</RoleCode></BusinessTransactionDocumentReference>'.
            '<EmployeeResponsibleParty><BusinessPartnerInternalID>'.$idResponsable.'</BusinessPartnerInternalID></EmployeeResponsibleParty>'.
            '<ReferenceParty><BusinessPartnerInternalID>'.$idContacto.'</BusinessPartnerInternalID></ReferenceParty>'.
            '<MainActivityParty><BusinessPartnerInternalID>'.$idCuenta.'</BusinessPartnerInternalID></MainActivityParty>'.
            '<EndDateTime timeZoneCode="UTC">'.$hoyMas2dias.'</EndDateTime>'.
            '<GroupCode>Z60</GroupCode>'.
            '<Name>'.$nota.' Opp: '.$idRef.'</Name>'.
            '<PriorityCode>2</PriorityCode>'.
            '<ProcessingTypeCode>0002</ProcessingTypeCode>'.
            '<StartDateTime timeZoneCode="UTC">'.$hoy.'</StartDateTime>'.
            '<TextCollection textListCompleteTransmissionIndicator="true">'.
            '<Text>'.
            '<TypeCode>10002</TypeCode>'.
            '<ContentText languageCode="ES">'.$nota.'</ContentText>'.
            '</Text>'.
            '</TextCollection>'.
			'<ns8:ZFuente_Task xmlns:ns8="http://sap.com/xi/AP/CustomerExtension/BYD/A2OER">'.$utmSource.'</ns8:ZFuente_Task>'.
			'<ns8:ZMedio_Task xmlns:ns8="http://sap.com/xi/AP/CustomerExtension/BYD/A2OER">'.$utmMedio.'</ns8:ZMedio_Task>'.
            '</ActivityTask>'.
            '</n0:TaskActivityBundleMaintainRequest_sync_V1>';

        return $body;
    }

    function getHeader()
    {
        
        $headerTask = [
            'Method: POST',
            'Content-Type: application/xml',
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

        $location = "https://e400060-iflmap.hcisbt.br1.hana.ondemand.com/http/crearactividadc4c";
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
