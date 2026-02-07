document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO GLOBAL ---
    const TEMPO_TOTAL_VIAGEM_HORAS = 36;
    const TEMPO_RETORNO_HORAS = 30;

    const CHAVE_PARADA = 'rota_parada_em';
    const CHAVE_RETORNO = 'rota_retorno_inicio';

    // --- BANCO DE DADOS DE ROTAS ---
    const ROTAS = {
        "58036": {
            id: "rota_jp_pb",

            destinoNome: "João Pessoa - PB",
            destinoDesc: "CEP: 58036-435 (Jardim Oceania)",

            start: [-43.8750, -16.7350],
            end:   [-34.8430, -7.0910],

            offsetHoras: 4,

            verificarRegras: function (_, map, loopInterval, timeBadge, carMarker) {

                // NÃO PARA DE NOVO
                if (localStorage.getItem(CHAVE_PARADA)) return false;

                const CHECKPOINT_PRF = [-16.1596, -42.2998];

                clearInterval(loopInterval);
                localStorage.setItem(CHAVE_PARADA, Date.now());

                if (carMarker) carMarker.setLatLng(CHECKPOINT_PRF);
                if (map) map.setView(CHECKPOINT_PRF, 16);

                if (timeBadge) {
                    timeBadge.innerText = "RETIDO NA FISCALIZAÇÃO";
                    timeBadge.style.backgroundColor = "#b71c1c";
                    timeBadge.style.color = "white";
                    timeBadge.style.border = "2px solid #ff5252";
                    timeBadge.style.animation = "blink 1.5s infinite";
                }

                const htmlPlaquinha = `
                    <div style="display:flex;align-items:center;gap:10px;font-family:sans-serif;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Pol%C3%ADcia_Rodovi%C3%A1ria_Federal_logo.svg/1024px-Pol%C3%ADcia_Rodovi%C3%A1ria_Federal_logo.svg.png" style="width:45px;">
                        <div>
                            <strong style="color:#b71c1c;font-size:14px;">PRF - BLOQUEIO</strong><br>
                            <span style="font-size:11px;">Salinas - MG</span>
                        </div>
                    </div>
                `;

                carMarker.bindTooltip(htmlPlaquinha, {
                    permanent: true,
                    direction: 'top',
                    className: 'prf-label',
                    offset: [0, -20]
                }).openTooltip();

                return true;
            }
        }
    };

    // --- VARIÁVEIS ---
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;
    let loopInterval = null;

    // --- CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes blink { 0%{opacity:1}50%{opacity:.6}100%{opacity:1} }
        .prf-label { background:white;border:2px solid #b71c1c;border-radius:8px;padding:5px }
    `;
    document.head.appendChild(style);

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) btnLogin.addEventListener('click', verificarCodigo);

    verificarSessaoSalva();

    function verificarCodigo() {
        const input = document.getElementById('access-code');
        const codigo = input.value.trim();
        const errorMsg = document.getElementById('error-msg');

        if (ROTAS[codigo]) {
            localStorage.setItem('codigoAtivo', codigo);

            const key = 'inicioViagem_' + codigo;
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, Date.now());
            }

            carregarInterface(codigo);
        } else {
            errorMsg.style.display = 'block';
            input.style.borderColor = 'red';
        }
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
            atualizarTextoInfo();
            iniciarMapa();
        });
    }

    function atualizarTextoInfo() {
        document.querySelector('.info-text').innerHTML = `
            <h3>Rastreamento Rodoviário</h3>
            <span id="time-badge" class="status-badge">CONECTANDO...</span>
            <p>Veículo sem nota fiscal</p>
            <p><strong>Origem:</strong> Montes Claros - MG</p>
            <p><strong>Destino:</strong> ${rotaAtual.destinoNome}</p>
        `;
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
            icon: L.divIcon({ html: '🚛', iconSize: [40,40] })
        }).addTo(map);

        loopInterval = setInterval(atualizarPosicaoTempoReal, 1000);
        atualizarPosicaoTempoReal();
    }

    function atualizarPosicaoTempoReal() {
        const badge = document.getElementById('time-badge');

        if (rotaAtual.verificarRegras) {
            const parou = rotaAtual.verificarRegras(null, map, loopInterval, badge, carMarker);
            if (parou) return;
        }

        const agora = Date.now();
        let progresso;

        if (localStorage.getItem(CHAVE_PARADA)) {

            if (!localStorage.getItem(CHAVE_RETORNO)) {
                localStorage.setItem(CHAVE_RETORNO, agora);
            }

            const inicio = parseInt(localStorage.getItem(CHAVE_RETORNO));
            progresso = (agora - inicio) / (TEMPO_RETORNO_HORAS * 3600000);

        } else {
            const inicio = parseInt(localStorage.getItem('inicioViagem_' + localStorage.getItem('codigoAtivo')));
            progresso = ((agora - inicio) + rotaAtual.offsetHoras * 3600000) / (TEMPO_TOTAL_VIAGEM_HORAS * 3600000);
        }

        progresso = Math.min(Math.max(progresso, 0), 1);

        const pos = getCoordenadaPorProgresso(progresso);
        carMarker.setLatLng(pos);
        desenharLinhaRestante(pos, progresso);

        if (progresso >= 1) {
            badge.innerText = "ENTREGUE";
        } else {
            const horas = ((1 - progresso) * TEMPO_RETORNO_HORAS).toFixed(1);
            badge.innerText = `EM TRÂNSITO: FALTA ${horas}h`;
        }
    }

    function getCoordenadaPorProgresso(pct) {
        const i = Math.floor(pct * (fullRoute.length - 1));
        return fullRoute[i];
    }

    function desenharLinhaRestante(pos, pct) {
        map.removeLayer(polyline);
        const i = Math.floor(pct * (fullRoute.length - 1));
        polyline = L.polyline([pos, ...fullRoute.slice(i + 1)], { dashArray: '10,10' }).addTo(map);
    }
});
