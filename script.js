document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    const ORIGEM = [-21.7878, -46.5613];          // Poços de Caldas
    const DESTINO = [-23.5425, -46.3117];         // Suzano
    const DURACAO_VIAGEM = 30 * 60 * 1000;        // 30 minutos (mais lento)
    const STORAGE_START_KEY = 'inicio_viagem';

    let map;
    let fullRoute = [];
    let retainedMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    // ================= LOGIN =================
    function verificarCodigo() {
        const input = document.getElementById('access-code');
        if (!input) return;

        if (input.value.trim() !== "39450") {
            alert("Código de rastreio inválido.");
            input.value = "";
            return;
        }

        localStorage.setItem('codigoAtivo', '39450');
        carregarInterface();
    }

    function verificarSessaoSalva() {
        if (localStorage.getItem('codigoAtivo') === "39450") {
            carregarInterface();
        }
    }

    function carregarInterface() {
        buscarRotaNaAPI().then(() => {
            document.getElementById('login-overlay')?.style.display = 'none';
            document.getElementById('info-card')?.style.display = 'flex';
            iniciarMapa();
        });
    }

    // ================= API =================
    async function buscarRotaNaAPI() {
        const ORS_TOKEN = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQzY2QyNmU1ZWNlOTRjZDJhYTBiZDE0NGU5YmFlYzlhIiwiaCI6Im11cm11cjY0In0=";

        const start = `${ORIGEM[1]},${ORIGEM[0]}`;
        const end = `${DESTINO[1]},${DESTINO[0]}`;

        const res = await fetch(
            `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${start}&end=${end}`
        );
        const data = await res.json();
        fullRoute = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    // ================= MAPA =================
    function iniciarMapa() {
        if (map) return;

        map = L.map('map', { zoomControl: false }).setView(ORIGEM, 9);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10',
            opacity: 0.8
        }).addTo(map);

        // 🔹 calcula posição REAL ao abrir
        let inicio = localStorage.getItem(STORAGE_START_KEY);
        if (!inicio) {
            inicio = Date.now();
            localStorage.setItem(STORAGE_START_KEY, inicio);
        } else {
            inicio = parseInt(inicio);
        }

        const progresso = Math.min((Date.now() - inicio) / DURACAO_VIAGEM, 1);
        const index = Math.floor(progresso * (fullRoute.length - 1));
        const posicaoInicial = fullRoute[index] || ORIGEM;

        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size:32px;">🚛</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        retainedMarker = L.marker(posicaoInicial, {
            icon,
            zIndexOffset: 1000
        }).addTo(map);

        atualizarStatus();
        animarCaminhao(inicio);
    }

    // ================= ANIMAÇÃO =================
    function animarCaminhao(inicio) {
        function mover() {
            const progresso = Math.min((Date.now() - inicio) / DURACAO_VIAGEM, 1);
            const index = Math.floor(progresso * (fullRoute.length - 1));
            const posicao = fullRoute[index];

            if (retainedMarker && posicao) {
                retainedMarker.setLatLng(posicao);
            }

            if (progresso < 1) requestAnimationFrame(mover);
        }
        mover();
    }

    // ================= STATUS =================
    function atualizarStatus() {
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "EM TRÂNSITO";
            badge.style.background = "#22c55e";
            badge.style.color = "#fff";
        }
    }
});
