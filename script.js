function animarCaminhao() {

    let inicio = localStorage.getItem(STORAGE_START_KEY);

    if (!inicio) {
        inicio = Date.now();
        localStorage.setItem(STORAGE_START_KEY, inicio);
    } else {
        inicio = parseInt(inicio);
    }

    function mover() {
        const agora = Date.now();
        let progresso = (agora - inicio) / DURACAO_VIAGEM;

        // 🔹 SE JÁ TIVER CHEGADO, REINICIA A VIAGEM
        if (progresso >= 1) {
            inicio = Date.now();
            localStorage.setItem(STORAGE_START_KEY, inicio);
            progresso = 0;

            // força voltar para Poços de Caldas
            if (retainedMarker) {
                retainedMarker.setLatLng(ORIGEM);
            }
        }

        const index = Math.floor(progresso * (fullRoute.length - 1));
        const posicao = fullRoute[index];

        if (retainedMarker && posicao) {
            retainedMarker.setLatLng(posicao);
        }

        requestAnimationFrame(mover);
    }

    mover();
}
