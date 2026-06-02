const express = require('express');
const router  = express.Router();
const db      = require('../db');

// 1. GET /api/computadores (Retorna todos)
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                id_computador,
                numero_computador AS numero, 
                configuracao AS descricao,
                15.00 AS valor_hora,
                CASE 
                    WHEN status LIKE 'Dispon%' THEN 'disponivel'
                    WHEN status = 'Em Uso' THEN 'ocupado'
                    WHEN status LIKE 'Manuten%' THEN 'manutencao'
                    ELSE 'disponivel'
                END AS status 
            FROM computadores 
            WHERE ativo = 1
            ORDER BY numero_computador ASC
        `;
        const [computadores] = await db.query(query);
        res.json(computadores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar a lista de computadores.' });
    }
});

// 2. GET /api/computadores/disponiveis 
router.get('/disponiveis', async (req, res) => {
    try {
        const query = `
            SELECT 
                id_computador, 
                numero_computador AS numero, 
                configuracao AS descricao, /* ADICIONADO PARA APARECER NO ABRIR SESSAO */
                15.00 AS valor_hora 
            FROM computadores 
            WHERE status LIKE 'Dispon%' AND ativo = 1
            ORDER BY numero_computador ASC
        `;
        const [disponiveis] = await db.query(query);
        res.json(disponiveis);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar computadores disponiveis.' });
    }
});

// 3. ROTA DE EMERGENCIA "RAIO-X"
router.get('/gerar-maquinas', async (req, res) => {
    try {
        const [qtd] = await db.query("SELECT COUNT(*) AS total FROM computadores");

        if (qtd[0].total === 0) {
            await db.query(`
                INSERT INTO computadores (numero_computador, status, configuracao) 
                VALUES 
                (1, 'Disponivel', 'PC Gamer Padrao'), 
                (2, 'Disponivel', 'PC Gamer Padrao'), 
                (3, 'Disponivel', 'PC Gamer Padrao'), 
                (4, 'Disponivel', 'PC Gamer Padrao'), 
                (5, 'Disponivel', 'PC Gamer Padrao')
            `);
        } else {
            await db.query("UPDATE computadores SET status = 'Disponivel'");
        }

        const [pcs] = await db.query("SELECT * FROM computadores");
        
        res.json({
            mensagem: "Operacao finalizada!",
            total_encontrado: pcs.length,
            dados_no_banco: pcs
        });
    } catch (error) {
        res.json({
            erro_fatal_banco: "O MySQL recusou a insercao dos computadores.",
            motivo: error.message
        });
    }
});

// 4. GET /api/computadores/:id (CURINGA)
router.get('/:id', async (req, res) => {
    try {
        const query = `
            SELECT 
                id_computador,
                numero_computador AS numero, 
                configuracao AS descricao, 
                15.00 AS valor_hora,
                status 
            FROM computadores 
            WHERE id_computador = ? AND ativo = 1
        `;
        const [computador] = await db.query(query, [req.params.id]);
        
        if (computador.length === 0) {
            return res.status(404).json({ error: 'Computador nao encontrado ou inativo.' });
        }
        res.json(computador[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar os detalhes.' });
    }
});

// 5. POST /api/computadores 
router.post('/', async (req, res) => {
    const numero = req.body.numero_computador || req.body.numero || req.body.nome;
    const status = req.body.status || 'Disponivel';
    const configuracao = req.body.configuracao || 'PC Gamer Padrao'; 
    
    if (!numero) {
        return res.status(400).json({ error: 'O numero de identificacao do computador e obrigatorio.' });
    }

    try {
        const query = 'INSERT INTO computadores (numero_computador, status, configuracao) VALUES (?, ?, ?)';
        const [resultado] = await db.query(query, [numero, status, configuracao]);
        res.status(201).json({ id: resultado.insertId, message: 'Sucesso!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. PUT /api/computadores/:id (EDITAR)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { numero, configuracao } = req.body;

    if (!numero) {
        return res.status(400).json({ error: 'O numero e obrigatorio.' });
    }

    try {
        await db.query(
            'UPDATE computadores SET numero_computador = ?, configuracao = ? WHERE id_computador = ?',
            [numero, configuracao, id]
        );
        res.json({ message: 'Computador atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar o computador.' });
    }
});

// 7. PUT /api/computadores/:id/status (MANUTENCAO)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    let statusParaBanco = 'Disponivel';
    if (status === 'manutencao') statusParaBanco = 'Manutencao';
    if (status === 'disponivel') statusParaBanco = 'Disponivel';

    try {
        await db.query('UPDATE computadores SET status = ? WHERE id_computador = ?', [statusParaBanco, id]);
        res.json({ message: 'Status atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar status do computador.' });
    }
});

// 8. DELETE /api/computadores/:id (EXCLUSAO LOGICA)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('UPDATE computadores SET ativo = 0 WHERE id_computador = ?', [id]);
        res.json({ message: 'Computador removido da Arena com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno ao tentar remover o computador.' });
    }
});

module.exports = router;