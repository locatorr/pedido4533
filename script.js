document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Poços de Caldas - MG
    const ORIGEM = [-21.7878, -46.5613];

    // Destino: Suzano - SP
    const DESTINO = [-23.5425, -46.3117];

    // Duração total da viagem (8 horas simuladas)
    const DURACAO_VIAGEM = 8 * 60 * 60 * 1000;

    // Ponto ANTES da entrada de Campinas-SP (PRF)
    const PARADA_PRF = [-22.9655, -47.0552];

    const STORAGE_START_KEY = 'inicio_viagem';

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
        if (map) return;

        map = L.map('map', { zoomControl: false }).setView(ORIGEM, 8);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10',
            opacity: 0.8
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size:32px;">🚛</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        retainedMarker = L.marker(ORIGEM, {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);

        atualizarStatusEmTransito();
        animarCaminhao();
    }

    // ================= ANIMAÇÃO =================
    function animarCaminhao() {

        let inicio = localStorage.getItem(STORAGE_START_KEY);

        if (!inicio) {
            inicio = Date.now();
            localStorage.setItem(STORAGE_START_KEY, inicio);
        } else {
            inicio = parseInt(inicio);
        }

        // Descobre o ponto da rota mais próximo da PRF
        let paradaIndex = fullRoute.reduce((closest, point, index) => {
            const dist = Math.hypot(
                point[0] - PARADA_PRF[0],
                point[1] - PARADA_PRF[1]
            );
            return dist < closest.dist
                ? { index, dist }
                : closest;
        }, { index: 0, dist: Infinity }).index;

        function mover() {
            const agora = Date.now();
            const progresso = Math.min((agora - inicio) / DURACAO_VIAGEM, 1);

            const index = Math.min(
                Math.floor(progresso * (fullRoute.length - 1)),
                paradaIndex
            );

            const posicao = fullRoute[index];

            if (retainedMarker && posicao) {
                retainedMarker.setLatLng(posicao);
            }

            if (index < paradaIndex) {
                requestAnimationFrame(mover);
            } else {
                atualizarStatusPRF();
            }
        }

        mover();
    }

    // ================= STATUS =================
    function atualizarStatusEmTransito() {
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "EM TRÂNSITO";
            badge.style.background = "#22c55e";
            badge.style.color = "white";
        }
    }

    function atualizarStatusPRF() {
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "PARADO PELA PRF – FALTA DE NOTA FISCAL";
            badge.style.background = "#dc2626";
            badge.style.color = "white";
        }
    }

});
