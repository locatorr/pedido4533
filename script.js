document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIG =================
    const TEMPO_VIAGEM_NOVA_HORAS = 30;

    const CHAVE_PARADA = 'rota_parada_em';
    const CHAVE_NOVA_VIAGEM = 'nova_viagem_inicio';

    // Coordenada da PRF Salinas
    const CHECKPOINT_PRF = [-16.1596, -42.2998]; // [lat, lng]

    // ================= ROTAS =================
    const ROTAS = {
        "58036": {
            destinoNome: "João Pessoa - PB",
            destinoDesc: "CEP: 58036-435 (Jardim Oceania)",

            start: [-43.8750, -16.7350], // Montes Claros
            end:   [-34.8430, -7.0910]   // João Pessoa
        }
    };

    // ================= VARS =================
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;
    let loopInterval = null;

    // ================= INIT =================
    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    // ================= FUNÇÕES =================

    function verificarCodigo() {
        const code = document.getElementById('access-code').value.trim();
        if (!ROTAS[code]) return;

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

        buscarRotaReal(rotaAtual.start, rotaAtual.end).then(() => {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';
            iniciarMapa();
        });
    }

    async function buscarRotaReal(start, end) {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
        const data = await fetch(url).then(r => r.json());
        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    function iniciarMapa() {
        map = L.map('map', { zoomControl: false }).setView(fullRoute[0], 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        polyline = L.polyline(fullRoute, { dashArray: '10,10' }).addTo(map);

        carMarker = L.marker(fullRoute[0], {
            icon: L.divIcon({ html: '🚛', iconSize: [40, 40] })
        }).addTo(map);

        loopInterval = setInterval(atualizarPosicao, 1000);
        atualizarPosicao();
    }

    // ================= LÓGICA PRINCIPAL =================

    function atualizarPosicao() {

        // SE AINDA NÃO PAROU → FORÇA PARADA EM SALINAS
        if (!localStorage.getItem(CHAVE_PARADA)) {
            pararNaPRF();
            return;
        }

        // NOVA VIAGEM (SALINAS → DESTINO)
        if (!localStorage.getItem(CHAVE_NOVA_VIAGEM)) {
            iniciarNovaViagem();
        }

        const inicio = parseInt(localStorage.getItem(CHAVE_NOVA_VIAGEM));
        const agora = Date.now();

        const progresso = Math.min(
            (agora - inicio) / (TEMPO_VIAGEM_NOVA_HORAS * 3600000),
            1
        );

        const pos = getCoordenadaPorProgresso(progresso);
        carMarker.setLatLng(pos);
        desenharLinhaRestante(pos, progresso);

        const badge = document.getElementById('time-badge');
        if (badge) {
            if (progresso >= 1) {
                badge.innerText = "ENTREGUE";
            } else {
                const h = ((1 - progresso) * TEMPO_VIAGEM_NOVA_HORAS).toFixed(1);
                badge.innerText = `EM NOVA VIAGEM • FALTA ${h}h`;
            }
        }
    }

    // ================= PRF =================

    function pararNaPRF() {
        clearInterval(loopInterval);
        localStorage.setItem(CHAVE_PARADA, Date.now());

        carMarker.setLatLng(CHECKPOINT_PRF);
        map.setView(CHECKPOINT_PRF, 16);

        const badge = document.getElementById('time-badge');
        if (badge) badge.innerText = "RETIDO NA PRF - SALINAS/MG";
    }

    // ================= NOVA ROTA =================

    function iniciarNovaViagem() {

        // 🔪 CORTA A ROTA EM SALINAS
        let indexMaisProximo = 0;
        let menorDist = Infinity;

        fullRoute.forEach((p, i) => {
            const d = Math.hypot(p[0] - CHECKPOINT_PRF[0], p[1] - CHECKPOINT_PRF[1]);
            if (d < menorDist) {
                menorDist = d;
                indexMaisProximo = i;
            }
        });

        // NOVA ROTA: SALINAS → DESTINO
        fullRoute = fullRoute.slice(indexMaisProximo);
        fullRoute[0] = CHECKPOINT_PRF;

        localStorage.setItem(CHAVE_NOVA_VIAGEM, Date.now());

        map.removeLayer(polyline);
        polyline = L.polyline(fullRoute, { dashArray: '10,10' }).addTo(map);

        loopInterval = setInterval(atualizarPosicao, 1000);
    }

    // ================= HELPERS =================

    function getCoordenadaPorProgresso(pct) {
        const idx = Math.floor(pct * (fullRoute.length - 1));
        return fullRoute[idx];
    }

    function desenharLinhaRestante(pos, pct) {
        map.removeLayer(polyline);
        const idx = Math.floor(pct * (fullRoute.length - 1));
        polyline = L.polyline([pos, ...fullRoute.slice(idx + 1)], { dashArray: '10,10' }).addTo(map);
    }
});
