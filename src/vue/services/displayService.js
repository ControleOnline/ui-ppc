
export const fetchDisplayType = async (displayId) => {
    try {
        const response = await api.fetch(`/displays/${displayId}`);
        return response;
    } catch (error) {
        console.error('Erro ao buscar tipo de display:', error);
        throw error;
    }
};

export const fetchQueuesForDisplay = async (displayId) => {
    try {
        const response = await api.fetch('/display_pcp', {
            params: { display: `/displays/${displayId}` }
        });
        return response;
    } catch (error) {
        console.error('Erro ao buscar filas para o display:', error);
        throw error;
    }
};
