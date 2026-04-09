document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Poços de Caldas - MG (apenas referência)
    const ORIGEM = [-21.7878, -46.5613];

    // Destino: Suzano - SP (não será alcançado)
    const DESTINO = [-23.5425, -46.3117];

    // Ponto antes da entrada de Campinas-SP (PRF)
    const PARADA_PRF = [-22.9655, -47.0552];

    let map;
    let fullRoute = [];
    let retainedMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    // ================= LOGIN =================
    function verificarCodigo() {
        const inputElement = document.getElementById('access-code');
        if (!inputElement) return;

        const code = inputElement.value.trim();

        if (code !== "39450") {
            alert("Código de rastreio inválido. Tente novamente.");
            inputElement.value = "";
            localStorage.removeItem('codigoAtivo');
            return;
        }

        localStorage.setItem('codigoAtivo', code);
        carregarInterface();
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');
        if (codigo === "39450") carregarInterface();
    }

    function carregarInterface() {
        const overlay = document.getElementById('login-overlay');
        const btnLogin = document.getElementById('btn-login');

        if (btnLogin) btnLogin.innerText = "Consultando...";

        buscarRotaNaAPI().then(() => {
            if (overlay) overlay.style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';
            iniciarMapa();
        });
    }

    // ================= BUSCA DA ROTA =================
    async function buscarRotaNaAPI() {
        const ORS_TOKEN = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQzY2QyNmU1ZWNlOTRjZDJhYTBiZDE0NGU5YmFlYzlhIiwiaCI6Im11cm11cjY0In0=";

        const start = `${ORIGEM[1]},${ORIGEM[0]}`;
        const end = `${DESTINO[1]},${DESTINO[0]}`;

        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${start}&end=${end}`;
        const response = await fetch(url);
        const data = await response.json();

        fullRoute = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    // ================= MAPA =================
    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(PARADA_PRF, 9);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10',
            opacity: 0.5
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size:32px;">🚛</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        // CAMINHÃO JÁ PARADO NA PRF
        retainedMarker = L.marker(PARADA_PRF, {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);

        atualizarStatusPRF();
    }

    // ================= STATUS =================
    function atualizarStatusPRF() {
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "PARADO PELA PRF – FALTA DE NOTA FISCAL";
            badge.style.background = "#dc2626";
            badge.style.color = "white";
        }
    }

});
