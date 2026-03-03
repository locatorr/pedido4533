document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIG =================
    const TEMPO_VIAGEM_RESTANTE_HORAS = 120; // 5 dias = 120 horas

    const CHECKPOINT_INICIO = [-3.1190, -60.0217]; // Manaus [lat, lng]

    const CHAVE_INICIO_RESTANTE = 'inicio_viagem_restante';

    // ================= ROTAS =================
    const ROTAS = {
        "58036": {
            destinoNome: "Paranaguá - PR",
            destinoDesc: "Rota: Manaus → Paraíba → Paranaguá",
            
            // Ordem: Manaus → João Pessoa (PB) → Paranaguá
            waypoints: [
                [-60.0217, -3.1190],   // Manaus [lng, lat]
                [-34.8641, -7.1150],   // João Pessoa - PB [lng, lat]
                [-48.5095, -25.5163]   // Paranaguá - PR [lng, lat]
            ]
        }
    };

    // ================= VARIÁVEIS =================
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;
    let loopInterval = null;
    let indexInicio = 0;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    function verificarCodigo() {
        const code = document.getElementById('access-code').value.trim();
        if (!ROTAS[code]) {
            alert("Código não encontrado.");
            return;
        }

        localStorage.setItem('codigoAtivo', code);
        carregarInterface(code);
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');
        if (codigo && ROTAS[codigo]) {
            document.getElementById('access-code').value = codigo;
        }
    }

    function carregarInterface(codigo) {
        rotaAtual = ROTAS[codigo];

        buscarRotaComParada(rotaAtual.waypoints).then(() => {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';
            iniciarMapa();
        });
    }

    async function buscarRotaComParada(pontos) {
        const coordenadas = pontos.map(p => `${p[0]},${p[1]}`).join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson`;

        const data = await fetch(url).then(r => r.json());

        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    function iniciarMapa() {

        map = L.map('map', { zoomControl: false })
            .setView(CHECKPOINT_INICIO, 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png')
            .addTo(map);

        // Rota completa
        L.polyline(fullRoute, {
            color: '#94a3b8',
            weight: 4,
            opacity: 0.5
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10'
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="car-icon">🚛</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        carMarker = L.marker(fullRoute[0], {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);

        if (!localStorage.getItem(CHAVE_INICIO_RESTANTE)) {
            localStorage.setItem(CHAVE_INICIO_RESTANTE, Date.now());
        }

        loopInterval = setInterval(atualizarPosicao, 1000);
        atualizarPosicao();
    }

    function atualizarPosicao() {

        const inicio = parseInt(localStorage.getItem(CHAVE_INICIO_RESTANTE));
        const agora = Date.now();

        let progresso = (agora - inicio) /
            (TEMPO_VIAGEM_RESTANTE_HORAS * 3600000);

        progresso = Math.min(Math.max(progresso, 0), 1);

        const idx = Math.floor(progresso * (fullRoute.length - 1));
        const pos = fullRoute[idx];

        carMarker.setLatLng(pos);
        desenharLinhaRestante(pos, idx);

        const badge = document.getElementById('time-badge');
        if (badge) {
            if (progresso >= 1) {
                badge.innerText = "ENTREGUE";
            } else {
                const horasRestantes = ((1 - progresso) * TEMPO_VIAGEM_RESTANTE_HORAS);
                const dias = (horasRestantes / 24).toFixed(1);
                badge.innerText = `EM TRÂNSITO • FALTAM ${dias} DIAS`;
            }
        }
    }

    function desenharLinhaRestante(pos, idx) {
        map.removeLayer(polyline);

        polyline = L.polyline(
            [pos, ...fullRoute.slice(idx + 1)],
            { dashArray: '10,10', color: '#2563eb', weight: 5 }
        ).addTo(map);
    }

});
